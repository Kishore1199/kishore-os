import { Injectable, inject } from '@angular/core';
import { CloudService } from './cloud.service';
import { FIRESTORE_EXTRAS } from './site.config';
import { VisitorMemory } from './visitor-memory.service';

const KEY = 'kv-feedback';
export interface Vote { up: boolean; kind: string; question: string; answer: string; at: number; }

/** Thumbs up or down. Sent to Kishore only when that is switched on; otherwise kept on this device. */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private cloud = inject(CloudService);
  private memory = inject(VisitorMemory);
  readonly shared = FIRESTORE_EXTRAS;
  readonly hint = FIRESTORE_EXTRAS ? 'Sends this question and answer to Kishore' : 'Saved on this device only';

  async vote(up: boolean, kind: string, question: string, answer: string): Promise<boolean> {
    const v: Vote = { up, kind: kind.slice(0, 30), question: question.slice(0, 300), answer: answer.slice(0, 1000), at: Date.now() };
    if (this.shared) {
      try { await this.cloud.sendFeedback(v); return true; } catch (e) { console.warn('[ALPHA] feedback not sent', e); return false; }
    }
    if (this.memory.on()) {
      try { localStorage.setItem(KEY, JSON.stringify([v, ...this.mine()].slice(0, 50))); } catch { /* storage unavailable */ }
    }
    return true;
  }

  mine(): Vote[] {
    try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
  }

  forget() {
    try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  }
}
