import { Injectable, signal } from '@angular/core';
import type { PlayGame } from './playground';

export const GAMES = [
  { id: 'bugs', title: 'Bug squash', text: 'Tap the bugs before they run.', icon: 'bug', color: '#e11d48' },
  { id: 'match', title: 'Stack match', text: 'Find the pairs of logos.', icon: 'layers', color: '#7c3aed' },
  { id: 'catch', title: 'Coffee catch', text: 'Catch the coffee, dodge the bugs.', icon: 'coffee', color: '#b45309' },
  { id: 'tictactoe', title: 'Three in a row', text: 'Noughts and crosses with ALPHA.', icon: 'grid', color: '#0891b2' },
  { id: 'reaction', title: 'Quick tap', text: 'Wait for green, then tap fast.', icon: 'zap', color: '#15803d' },
  { id: 'rps', title: 'Rock paper scissors', text: 'ALPHA learns your habits.', icon: 'spark', color: '#c026d3' },
  { id: 'detective', title: 'Skill detective', text: 'Guess the skill from clues.', icon: 'search', color: '#1d4ed8' },
  { id: 'race', title: 'Typing race', text: 'Type faster than ALPHA.', icon: 'keyboard', color: '#0f766e' },
  { id: 'studio', title: 'Robot studio', text: 'Direct a show for ALPHA.', icon: 'bot', color: '#4338ca' },
] as const;
export type Game = (typeof GAMES)[number]['id'];
export const gameId = (v: string): Game | undefined => GAMES.find(g => g.id === v)?.id;

/** Which game the AI Playground shows (an AI game or a quick game); null is the list of games. */
@Injectable({ providedIn: 'root' })
export class ArcadeState {
  readonly game = signal<Game | PlayGame | null>(null);
}

export const best = (k: string) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
export const save = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* storage unavailable */ } };

// ───────── noughts and crosses ─────────

export type Cell = 'X' | 'O' | null;
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export const LEVELS = ['Easy', 'Normal', 'Hard'] as const;
export type Level = (typeof LEVELS)[number];

export function winner(b: readonly Cell[]): { who: 'X' | 'O'; line: number[] } | 'draw' | null {
  for (const line of LINES) { const who = b[line[0]]; if (who && who === b[line[1]] && who === b[line[2]]) return { who, line }; }
  return b.every(Boolean) ? 'draw' : null;
}
const empty = (b: readonly Cell[]) => b.flatMap((c, i) => (c ? [] : [i]));
const put = (b: readonly Cell[], i: number, c: Cell) => b.map((x, k) => (k === i ? c : x));
const wins = (b: readonly Cell[], who: 'X' | 'O') => empty(b).find(i => { const w = winner(put(b, i, who)); return !!w && w !== 'draw'; });

function score(b: readonly Cell[], mine: boolean, depth: number): number {
  const w = winner(b);
  if (w === 'draw') return 0;
  if (w) return w.who === 'O' ? 10 - depth : depth - 10;
  const next = empty(b).map(i => score(put(b, i, mine ? 'O' : 'X'), !mine, depth + 1));
  return mine ? Math.max(...next) : Math.min(...next);
}
/** ALPHA plays O. Easy often misses, Normal sees one move ahead, Hard never loses. */
export function alphaMove(b: readonly Cell[], level: Level, random = Math.random): number {
  const free = empty(b);
  const any = () => free[Math.floor(random() * free.length)];
  if (level === 'Hard') {
    const marks = free.map(i => score(put(b, i, 'O'), false, 1)), top = Math.max(...marks);
    const good = free.filter((_, k) => marks[k] === top);
    return good[Math.floor(random() * good.length)];
  }
  if (level === 'Easy' && random() < 0.6) return any();
  return wins(b, 'O') ?? wins(b, 'X') ?? (level === 'Normal' && b[4] === null ? 4 : any());
}

// ───────── coffee catch ─────────

export interface Drop { id: number; kind: 'coffee' | 'star' | 'bug'; x: number; y: number; v: number; }
export const DROP = { coffee: { icon: '☕', points: 1 }, star: { icon: '⭐', points: 3 }, bug: { icon: '🐛', points: -2 } } as const;
export function newDrop(id: number, seconds: number, random = Math.random): Drop {
  const r = random();
  return { id, kind: r < 0.1 ? 'star' : r < 0.34 ? 'bug' : 'coffee', x: 6 + random() * 88, y: -6, v: 26 + seconds * 0.9 + random() * 12 };
}
/** Is the drop in the tray? Positions are percentages of the field. */
export const caught = (d: Drop, tray: number, half = 10) => d.y >= 86 && d.y <= 96 && Math.abs(d.x - tray) <= half;
