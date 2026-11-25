import { Injectable, signal } from '@angular/core';

const KEY = 'kv-wallpaper-mood';

/** Does the wallpaper follow ALPHA's mood and the time of day? */
@Injectable({ providedIn: 'root' })
export class WallpaperMood {
  readonly on = signal(this.load());

  toggle() {
    this.on.update(v => !v);
    try { localStorage.setItem(KEY, this.on() ? '1' : '0'); } catch { /* storage unavailable */ }
  }

  private load() {
    try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }
  }
}

const MOODS: Record<string, string> = { love: '#ec4899', party: '#f59e0b', wow: '#22d3ee', sad: '#3b82f6', angry: '#ef4444', happy: '#facc15', highfive: '#34d399', cool: '#8b5cf6', shy: '#f9a8d4' };

/** The tint for a moment: a strong one for a mood, a light one for the hour. */
export function tint(mood: string | null, hour: number): { color: string; amount: number } {
  if (mood && MOODS[mood]) return { color: MOODS[mood], amount: 0.45 };
  if (hour >= 5 && hour < 9) return { color: '#fb923c', amount: 0.16 };
  if (hour >= 17 && hour < 20) return { color: '#f472b6', amount: 0.18 };
  if (hour >= 22 || hour < 5) return { color: '#1e3a8a', amount: 0.2 };
  return { color: '#ffffff', amount: 0 };
}
