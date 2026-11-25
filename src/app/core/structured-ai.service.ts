import { Injectable, inject } from '@angular/core';
import { CloudService } from './cloud.service';
import { DeviceAi } from './device-ai.service';

/** One answer from Gemini, else from the on-device model, else null (callers have a no-AI fallback). */
@Injectable({ providedIn: 'root' })
export class StructuredAi {
  private cloud = inject(CloudService);
  private device = inject(DeviceAi);

  /** Plain text, with who wrote it. Null when no AI is available or it was aborted. */
  async text(system: string, prompt: string, signal: AbortSignal, o: { reserve?: number; tokens?: number } = {}): Promise<{ text: string; via: 'gemini' | 'device' } | null> {
    if (this.cloud.remaining() > (o.reserve ?? 0)) {
      try { return { text: await this.cloud.generateText(system, prompt, signal, o.tokens), via: 'gemini' }; }
      catch (e) {
        if (signal.aborted) return null;
        this.cloud.reportFailure(e);
      }
    }
    await this.device.check();
    if (this.device.state() === 'ready' && !signal.aborted) {
      try {
        const text = await this.device.text(system, prompt.slice(0, 12000), signal);
        if (text) return { text, via: 'device' };
      } catch (e) { if (!signal.aborted) console.warn('[ALPHA] on-device AI failed', e); }
    }
    return null;
  }

  /** `reserve` keeps some of today's Gemini requests for other features. Returns null when aborted. */
  async json(system: string, schema: Record<string, unknown>, prompt: string, signal: AbortSignal, reserve = 0): Promise<unknown> {
    if (this.cloud.remaining() > reserve) {
      try { return await this.cloud.generateJson(system, schema, prompt, signal); }
      catch (e) {
        if (signal.aborted) return null;
        this.cloud.reportFailure(e);
      }
    }
    await this.device.check();
    if (this.device.state() === 'ready' && !signal.aborted) {
      try { return await this.device.json(system, schema, prompt, signal); }
      catch (e) { if (!signal.aborted) console.warn('[ALPHA] on-device AI failed', e); }
    }
    return null;
  }
}
