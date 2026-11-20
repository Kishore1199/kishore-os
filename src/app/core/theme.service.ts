import { Injectable, effect, signal } from '@angular/core';

const STORAGE_KEY = 'kv-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(this.initial());

  constructor() {
    effect(() => {
      const dark = this.isDark();
      document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
      } catch {
        /* storage unavailable — theme just won't persist */
      }
    });
  }

  toggle() {
    this.isDark.update(v => !v);
  }

  private initial(): boolean {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved === 'dark';
    } catch {
      /* ignore */
    }
    return true; // dark-first design
  }
}

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
