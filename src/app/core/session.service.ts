import { Injectable, effect, inject, untracked } from '@angular/core';
import { OsService, Win, winId } from './os.service';
import { VisitorMemory } from './visitor-memory.service';

const KEY = 'kv-windows';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Remembers which windows were open, in this browser. Only names and positions; "Forget me" clears it. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private os = inject(OsService);
  private memory = inject(VisitorMemory);
  private readonly before = this.read();
  /** already put back, after a reload */
  restored = false;

  constructor() {
    let first = true;
    let t: ReturnType<typeof setTimeout>;
    effect(() => {
      const ws = this.os.wins(), on = this.memory.on();
      if (first) { first = false; return; }
      clearTimeout(t);
      untracked(() => {
        if (!on) { this.forget(); return; }
        t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(ws)); } catch { /* storage unavailable */ } }, 400);
      });
    });
  }

  /** the windows that were open when the last visit ended */
  last(): Win[] {
    return this.before;
  }

  forget() {
    try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  }

  private read(): Win[] {
    if (!this.memory.on()) return [];
    try {
      const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      if (!Array.isArray(v)) return [];
      const seen = new Set<string>();
      return v.filter((w): w is Win => {
        const id = winId(w?.id);
        if (!id || seen.has(id) || ![w.x, w.y, w.w, w.h, w.z].every(num)) return false;
        seen.add(id);
        return true;
      }).slice(0, 8).map(({ id, x, y, w, h, z, min, max }) => ({ id, x, y, w, h, z, min: !!min, max: !!max }));
    } catch { return []; }
  }
}
