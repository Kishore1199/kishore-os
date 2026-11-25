import { Injectable, signal } from '@angular/core';

export interface TraceStep { kind: 'model' | 'tool'; label: string; ms: number; ok: boolean; tokensIn?: number; tokensOut?: number; detail?: string; }
export interface TraceRun { id: number; at: number; title: string; steps: TraceStep[]; ms: number; done: boolean; }

const MAX = 20;

/** What the AI did, step by step. Kept in memory only, and gone when the page closes. */
@Injectable({ providedIn: 'root' })
export class TraceStore {
  readonly runs = signal<TraceRun[]>([]);
  private n = 0;

  begin(title: string): TraceRecorder {
    const run: TraceRun = { id: ++this.n, at: Date.now(), title: title.slice(0, 160), steps: [], ms: 0, done: false };
    this.runs.update(r => [run, ...r].slice(0, MAX));
    const started = performance.now();
    const put = (change: Partial<TraceRun>) => this.runs.update(rs => rs.map(r => (r.id === run.id ? { ...r, ...change } : r)));
    const steps: TraceStep[] = [];
    return {
      step: s => { steps.push({ ...s, ms: Math.round(s.ms), detail: s.detail?.slice(0, 400) }); put({ steps: [...steps], ms: Math.round(performance.now() - started) }); },
      end: () => put({ done: true, ms: Math.round(performance.now() - started) }),
    };
  }

  clear() {
    this.runs.set([]);
  }
}
export interface TraceRecorder { step(s: TraceStep): void; end(): void; }

/** Token counts from a Gemini reply, when it reports them. */
export function tokens(res: unknown): { tokensIn?: number; tokensOut?: number } {
  const u = (res as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } } | null)?.usageMetadata;
  return u ? { tokensIn: u.promptTokenCount, tokensOut: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0) } : {};
}
