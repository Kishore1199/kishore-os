import { Injectable, signal } from '@angular/core';

/** Chrome's built-in Prompt API (only the parts used here). */
interface Session { prompt(input: string, o?: { responseConstraint?: unknown; signal?: AbortSignal }): Promise<string>; destroy(): void; }
interface LanguageModelApi {
  availability(o?: unknown): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(o?: unknown): Promise<Session>;
}
const api = () => (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel;

const OPTIONS = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
const OPT_IN = 'kv-device-ai';
const TIMEOUT_MS = 45_000;

/** none: this browser can't · ask: possible, needs the visitor's OK · loading: downloading or starting · ready: use it */
export type DeviceState = 'none' | 'ask' | 'loading' | 'ready';

/** Optional fallback that runs in the visitor's own Chrome when Gemini can't be used. It can't call tools. */
@Injectable({ providedIn: 'root' })
export class DeviceAi {
  readonly state = signal<DeviceState>('none');
  /** a large download is needed first */
  readonly needsDownload = signal(false);
  readonly progress = signal(0);
  private checked = false;

  /** Look for the model once; never downloads anything. */
  async check() {
    if (this.checked || !api()) return;
    this.checked = true;
    try {
      const a = await api()!.availability(OPTIONS);
      this.needsDownload.set(a === 'downloadable' || a === 'downloading');
      this.state.set(a === 'unavailable' ? 'none' : a === 'available' && this.optedIn() ? 'ready' : 'ask');
    } catch { this.state.set('none'); }
  }

  /** Call from a click: Chrome requires one before it downloads the model. */
  async enable() {
    if (this.state() !== 'ask') return;
    this.state.set('loading');
    try {
      const s = await api()!.create({ ...OPTIONS, monitor: (m: EventTarget) => m.addEventListener('downloadprogress', e => this.progress.set((e as ProgressEvent).loaded)) });
      s.destroy();
      try { localStorage.setItem(OPT_IN, '1'); } catch { /* storage unavailable */ }
      this.state.set('ready');
    } catch (e) {
      console.warn('[ALPHA] on-device AI could not start', e);
      this.state.set('none');
    }
  }

  async text(system: string, prompt: string, signal: AbortSignal): Promise<string> {
    return (await this.run(system, prompt, signal)).trim();
  }

  async json(system: string, schema: unknown, prompt: string, signal: AbortSignal): Promise<unknown> {
    return JSON.parse(await this.run(system, prompt, signal, schema));
  }

  private async run(system: string, prompt: string, outer: AbortSignal, responseConstraint?: unknown): Promise<string> {
    const signal = AbortSignal.any([outer, AbortSignal.timeout(TIMEOUT_MS)]);
    const s = await api()!.create({ ...OPTIONS, initialPrompts: [{ role: 'system', content: system }], signal });
    try { return await s.prompt(prompt, { signal, ...(responseConstraint ? { responseConstraint } : {}) }); }
    finally { s.destroy(); }
  }

  private optedIn() {
    try { return localStorage.getItem(OPT_IN) === '1'; } catch { return false; }
  }
}
