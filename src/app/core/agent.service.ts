import { Injectable, inject } from '@angular/core';
import type { Content, Part } from 'firebase/ai';
import { AgentLink, AgentStep, AgentTools, ToolResult } from './agent.tools';
import { CloudService } from './cloud.service';
import { LanguageService } from './language.service';
import { TraceRecorder, TraceStore, tokens } from './trace.store';
import { VisitorMemory } from './visitor-memory.service';

/** Gemini requests allowed for one question. The last one must answer in words. */
const MAX_TURNS = 3;
const MAX_CALLS_PER_TURN = 4;
/** after this long, stop using tools and answer with what we have */
const WRAP_UP_MS = 15000;

export interface AgentResult {
  /** null when Gemini could not answer (the caller falls back to the offline brain) */
  text: string | null;
  steps: AgentStep[];
  links: AgentLink[];
  tour?: ToolResult['tour'];
  /** some tool already ran, so the fallback must not navigate or copy again */
  acted: boolean;
}

/**
 * ALPHA's agent loop: Gemini picks tools, the browser runs them, the results go back,
 * and it repeats until Gemini answers. No server is involved.
 */
@Injectable({ providedIn: 'root' })
export class AgentService {
  private cloud = inject(CloudService);
  private tools = inject(AgentTools);
  private memory = inject(VisitorMemory);
  private lang = inject(LanguageService);
  private traces = inject(TraceStore);

  async run(question: string, signal: AbortSignal, onSteps: (s: AgentStep[]) => void): Promise<AgentResult> {
    const out: AgentResult = { text: null, steps: [], links: [], acted: false };
    const note = [this.memory.note(), this.lang.note()].filter(Boolean).join('\n');
    const trace = this.traces.begin(question);
    const contents: Content[] = [...this.cloud.recentTurns(), { role: 'user', parts: [{ type: 'text', text: note ? `${note}\n\n${question}` : question }] }];
    const seen = new Set<string>();
    const started = Date.now();
    const emit = () => { if (!signal.aborted) onSteps([...out.steps]); };

    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const mustAnswer = turn === MAX_TURNS - 1 || this.cloud.remaining() <= 1 || Date.now() - started > WRAP_UP_MS;
        const asked = performance.now();
        const res = await this.cloud.generate(contents, signal, mustAnswer);
        trace.step({ kind: 'model', label: `Request ${turn + 1}${mustAnswer ? ' (answer only)' : ''}`, ms: performance.now() - asked, ok: true, ...tokens(res), detail: (res.functionCalls() ?? []).map(c => c.name).join(', ') || 'wrote the answer' });
        if (signal.aborted) return out;
        const calls = mustAnswer ? [] : (res.functionCalls() ?? []);

        if (!calls.length) {
          out.text = res.text().replace(/[*_#`>]/g, '').trim() || null;
          if (out.text) this.cloud.remember(question, out.text);
          return out;
        }

        // send the model's own turn back untouched: it carries the signatures Gemini needs to continue
        contents.push(res.candidates![0].content);
        const replies: Part[] = [];
        for (const [i, call] of calls.entries()) {
          if (signal.aborted) return out;
          const args = (call.args ?? {}) as Record<string, unknown>;
          const key = call.name + JSON.stringify(args);
          let response: Record<string, unknown>;
          if (i >= MAX_CALLS_PER_TURN) response = { error: 'Too many tool calls at once.' };
          else if (seen.has(key)) response = { error: 'You already made this exact call. Answer now.' };
          else {
            seen.add(key);
            const result = await this.runTool(call.name, args, out, emit, trace);
            if (signal.aborted) return out;
            if (result.tour) {
              const { title, steps } = result.tour;
              out.tour = result.tour;
              out.text = `Here's your tour, “${title}”: ${steps.map(s => s.project ?? s.app).join(' → ')}.`;
              this.cloud.remember(question, out.text);
              return out;
            }
            // the tool already knows the whole answer: save the extra request
            if (result.say && calls.length === 1) {
              out.text = result.say;
              this.cloud.remember(question, out.text);
              return out;
            }
            response = result.data;
          }
          replies.push({ type: 'functionResponse', functionResponse: { ...(call.id ? { id: call.id } : {}), name: call.name, response } });
        }
        contents.push({ role: 'function', parts: replies });
      }
    } catch (e) {
      if (!signal.aborted) this.cloud.reportFailure(e);
      trace.step({ kind: 'model', label: signal.aborted ? 'Cancelled' : 'Request failed', ms: 0, ok: false, detail: String((e as Error)?.message ?? e) });
    } finally { trace.end(); }
    return out;
  }

  private async runTool(name: string, args: Record<string, unknown>, out: AgentResult, emit: () => void, trace: TraceRecorder): Promise<ToolResult> {
    const began = performance.now();
    const step: AgentStep = { ...this.tools.describe(name, args), state: 'run' };
    const at = out.steps.push(step) - 1;
    emit();
    let result: ToolResult;
    try { result = await this.tools.run(name, args); }
    catch (e) {
      console.warn(`[ALPHA] ${name} failed`, e);
      result = { ok: false, label: `${step.label}: failed`, data: { error: 'The tool failed.' } };
    }
    trace.step({ kind: 'tool', label: name, ms: performance.now() - began, ok: result.ok, detail: `${JSON.stringify(args)} → ${result.label}` });
    out.acted = true;
    out.steps[at] = { ...step, label: result.label, state: result.ok ? 'ok' : 'fail' };
    for (const l of result.links ?? []) if (!out.links.some(x => x.url === l.url)) out.links.push(l);
    emit();
    return result;
  }
}
