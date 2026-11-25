import { EXPERIENCE, SKILL_CATEGORIES } from '../data/portfolio.data';
import { evidence, skillKey } from '../core/evidence';

// ───────── skill detective ─────────
export interface Mystery { name: string; clues: string[]; }
const CAST = SKILL_CATEGORIES.flatMap(c => c.skills.map(s => ({ name: s.name, group: c.name, e: evidence(s.name) }))).filter(x => x.e.projects.length);
export const MYSTERIES = CAST.length;

/** A skill Kishore really used, with clues from vague to obvious. */
export function mystery(skip: readonly string[] = [], random = Math.random): Mystery {
  const pool = CAST.filter(x => !skip.includes(x.name));
  const x = (pool.length ? pool : CAST)[Math.floor(random() * (pool.length || CAST.length))];
  const n = x.e.projects.length;
  return {
    name: x.name,
    clues: [
      `It belongs to ${x.group}.`,
      `Kishore used it in ${n} project${n > 1 ? 's' : ''}${x.e.roles.length ? ` and it is part of ${x.e.roles.length === EXPERIENCE.length ? 'both jobs' : 'one job'}` : ''}.`,
      `One of those projects is ${x.e.projects[0]}.`,
      `Its name has ${x.name.length} characters${x.name.includes(' ') ? `, in ${x.name.split(' ').length} words` : ''}.`,
      `It starts with “${x.name[0]}” and ends with “${x.name.at(-1)}”.`,
    ],
  };
}
export const sameSkill = (guess: string, name: string) => !!guess.trim() && skillKey(guess) === skillKey(name);

// ───────── rock, paper, scissors ─────────
export type Hand = 'rock' | 'paper' | 'scissors';
export const HANDS: Hand[] = ['rock', 'paper', 'scissors'];
const BEATS: Record<Hand, Hand> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
export const beats = (a: Hand, b: Hand) => BEATS[a] === b;
const counter = (h: Hand) => HANDS.find(x => beats(x, h))!;

/** ALPHA studies your moves: what do you usually play after your last one? */
export function alphaHand(history: readonly Hand[], random = Math.random): { hand: Hand; why: string } {
  const pick = () => HANDS[Math.floor(random() * 3)];
  if (history.length < 3 || random() < 0.2) return { hand: pick(), why: 'a guess' };
  const last = history[history.length - 1];
  const after: Record<Hand, number> = { rock: 0, paper: 0, scissors: 0 };
  for (let i = 1; i < history.length; i++) if (history[i - 1] === last) after[history[i]]++;
  const best = HANDS.reduce((a, b) => (after[b] > after[a] ? b : a));
  if (!after[best]) return { hand: pick(), why: 'a guess' };
  return { hand: counter(best), why: `after ${last} you often play ${best}` };
}

// ───────── typing race ─────────
export const SNIPPETS: { lang: string; text: string }[] = [
  { lang: 'Java', text: 'return orders.stream().filter(o -> o.total() > 100).map(Order::id).toList();' },
  { lang: 'Java', text: 'public record Patient(Long id, String name, LocalDate born) {}' },
  { lang: 'Spring', text: '@GetMapping("/{id}") public Visit one(@PathVariable Long id) { return service.find(id); }' },
  { lang: 'Angular', text: 'readonly total = computed(() => this.items().reduce((n, i) => n + i.price, 0));' },
  { lang: 'SQL', text: 'SELECT dept_id, MAX(salary) FROM employee GROUP BY dept_id ORDER BY 2 DESC;' },
  { lang: 'TypeScript', text: 'const byId = new Map(users.map(u => [u.id, u] as const));' },
];
export const RACE_SPEEDS = { Easy: 22, Normal: 38, Hard: 58 } as const;
export const wpm = (chars: number, ms: number) => (ms > 0 ? Math.round(chars / 5 / (ms / 60000)) : 0);
/** how many characters are right from the start */
export function correctPrefix(typed: string, target: string): number {
  let i = 0;
  while (i < typed.length && i < target.length && typed[i] === target[i]) i++;
  return i;
}

// ───────── daily challenge ─────────
/** the visitor's local date, as 2026-11-26 */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** the same numbers for everybody on the same day */
export function seeded(key: string): () => number {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
export interface Streak { day: string; right: boolean; pick: number; streak: number; best: number; }
export function nextStreak(old: Streak | null, today: string, right: boolean, pick: number, now = new Date()): Streak {
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const run = right ? (old && old.day === dayKey(y) && old.right ? old.streak + 1 : 1) : 0;
  return { day: today, right, pick, streak: run, best: Math.max(run, old?.best ?? 0) };
}
