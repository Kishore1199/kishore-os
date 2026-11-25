import { Injectable } from '@angular/core';

/**
 * Single source of truth for the scroll position.
 * `window.scrollY` is read exactly once per scroll event, before any component writes to the DOM,
 * so no consumer ever forces a synchronous layout by reading it later in the frame.
 */
@Injectable({ providedIn: 'root' })
export class ScrollService {
  private _y = typeof window !== 'undefined' ? window.scrollY : 0;
  private listeners = new Set<(y: number) => void>();
  private frame = 0;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener(
      'scroll',
      () => {
        this._y = window.scrollY;
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
          this.frame = 0;
          for (const fn of this.listeners) fn(this._y);
        });
      },
      { passive: true, capture: true },
    );
  }

  /** Last known scroll offset (no layout read). */
  get y() {
    return this._y;
  }

  /** Called at most once per animation frame with the latest scroll offset. */
  onFrame(fn: (y: number) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
