import { Injectable, inject, signal } from '@angular/core';
import { AssistantBus } from '../core/assistant.bus';
import { CloudService } from '../core/cloud.service';
import { GithubService } from '../core/github.service';
import { NotesService, chapter } from '../core/notes.service';
import { StructuredAi } from '../core/structured-ai.service';
import { TeamStep, runTeam } from './agent-team';
import { LabId } from './lab-ids';
import { labTools } from './lab-tools';
import { LabLink, LabTool, Values } from './lab.types';
import { parseMarkdown } from './md';
import { planRoute } from './navigate';
import { QUIZ_SCHEMA, QUIZ_SYSTEM, QuizItem, firstPoint, notesQuiz, parseQuiz, shuffle } from './quiz';

export interface LabOutput { tool: LabTool; values: Values; text: string; via: 'gemini' | 'device' | 'rules'; links: LabLink[]; }

/** AI requests to leave for the chat */
const RESERVE = 2;

@Injectable({ providedIn: 'root' })
export class LabService {
  private ai = inject(StructuredAi);
  private notes = inject(NotesService);
  private bus = inject(AssistantBus);
  readonly cloud = inject(CloudService);
  readonly tools = labTools(this.notes, inject(GithubService));
  readonly busy = signal('');
  readonly error = signal('');
  readonly output = signal<LabOutput | null>(null);
  readonly steps = signal<TeamStep[]>([]);
  private ctrl = new AbortController();

  tool(id: LabId): LabTool {
    return this.tools.find(t => t.id === id)!;
  }

  async run(tool: LabTool, values: Values) {
    this.reset();
    const missing = tool.fields.find(f => !f.optional && f.type !== 'select' && (values[f.key] ?? '').trim().length < 2);
    if (missing) { this.error.set(`Please fill in "${missing.label}".`); return; }
    if (tool.id === 'resume' && (values['ask'] ?? '').trim().length < 40) { this.error.set('Choose a file or paste your resume.'); return; }
    const ctrl = this.ctrl;
    this.busy.set(tool.ai ? 'Thinking…' : 'Working…');
    try {
      let out: LabOutput | null = null;
      if (tool.id === 'evals') {
        const { LIVE_MAX, evalTable, runLive, runScripted } = await import('./evals');
        const live = values['mode'].startsWith('Live');
        if (live && this.cloud.remaining() < 2) { this.error.set('There are not enough AI requests left for the live test today.'); return; }
        const r = live ? await runLive(this.cloud, this.notes, ctrl.signal, x => { if (!ctrl.signal.aborted) this.busy.set(`${x.length} done…`); }) : await runScripted(this.notes);
        out = { tool, values, text: evalTable(r, live ? `Live tests (up to ${LIVE_MAX} requests)` : 'Scripted tests'), via: 'rules', links: [] };
      } else if (tool.id === 'team') {
        const r = await runTeam(values['ask'], {
          json: (s, schema, p) => this.ai.json(s, schema, p, ctrl.signal, RESERVE),
          text: async (s, p) => (await this.ai.text(s, p, ctrl.signal, { reserve: RESERVE }))?.text ?? null,
        }, this.notes, () => !ctrl.signal.aborted, s => { if (!ctrl.signal.aborted) this.steps.set(s); });
        out = { tool, values, text: r.text, via: r.ai ? 'gemini' : 'rules', links: r.links };
      } else if (tool.ai) {
        const prompt = await tool.ai.prompt(values);
        const r = await this.ai.text(tool.ai.system, prompt, ctrl.signal, { tokens: tool.ai.tokens, reserve: RESERVE });
        // a diagram request without a diagram is no use: draw the simple one instead
        if (r && (tool.id !== 'diagram' || parseMarkdown(r.text).some(b => b.k === 'mermaid'))) out = { tool, values, text: r.text, via: r.via, links: [] };
      }
      if (ctrl.signal.aborted) return;
      if (!out) {
        const r = await tool.local(values);
        out = { tool, values, text: r.text, via: 'rules', links: r.links ?? [] };
      }
      if (!ctrl.signal.aborted) this.output.set(out);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      console.warn(`[lab] ${tool.id} failed`, e);
      this.error.set('Something went wrong. Please try again.');
    } finally {
      if (!ctrl.signal.aborted) this.busy.set('');
    }
  }

  show(tool: LabTool, text: string) {
    this.output.set({ tool, values: {}, text, via: 'rules', links: [] });
  }

  /** Quiz questions for one chapter: from the notes, or rewritten by AI when asked. */
  async quiz(key: string, useAi: boolean): Promise<{ items: QuizItem[]; ai: boolean }> {
    const ctrl = this.ctrl;
    const notes = await this.notes.notes(key);
    if (useAi) {
      const source = shuffle(notes.filter(n => firstPoint(n[1]))).slice(0, 5);
      const items = parseQuiz(await this.ai.json(QUIZ_SYSTEM, QUIZ_SCHEMA, `CHAPTER: ${chapter(key)?.title}\n${source.map(([q, a], i) => `NOTE ${i + 1}: ${q}\n${a.slice(0, 600)}`).join('\n\n')}`, ctrl.signal, RESERVE));
      if (items.length) return { items, ai: true };
    }
    return { items: notesQuiz(notes), ai: false };
  }

  /** Walk through the places named in a command. Returns false when none was recognised. */
  async navigate(command: string): Promise<boolean> {
    const route = planRoute(command);
    for (const [i, step] of route.entries()) {
      if (i) await new Promise(r => setTimeout(r, 1800));
      this.bus.notify(`${i + 1}/${route.length} ${step.label}`);
      if (step.project) this.bus.showProject(step.project);
      await this.bus.go(step.section);
    }
    return route.length > 0;
  }

  reset() {
    this.ctrl.abort();
    this.ctrl = new AbortController();
    this.busy.set('');
    this.error.set('');
    this.output.set(null);
    this.steps.set([]);
  }
}
