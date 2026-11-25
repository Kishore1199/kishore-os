import { Injectable, computed, signal } from '@angular/core';
import { PROJECTS, SKILL_CATEGORIES } from '../data/portfolio.data';
import { fold, plainWords } from './evidence';

export type Role = 'recruiter' | 'developer' | 'student' | 'client';
export interface TopicScore { n: number; avg: number; }
interface State {
  on: boolean;
  role: Role | null;
  /** site skills and projects the visitor asked about, most recent last */
  interests: string[];
  visits: number;
  last: number;
  /** mock-interview results per chapter, score out of 10 */
  topics: Record<string, TopicScore>;
}

const KEY = 'kv-visitor';
const SESSION = 'kv-visit-counted';
const MAX_INTERESTS = 5;
const ROLES: [Role, RegExp][] = [
  ['recruiter', /\b(i'?m|i am|as|for) (a |an |the )?([\w ]{0,24})?(recruiter|hr|hiring manager|talent (partner|scout|acquisition))\b|\b(we'?re|we are|i'?m|i am) hiring\b/i],
  ['student', /\b(i'?m|i am|as) (a |an )?([\w ]{0,24})?(student|fresher|graduate)\b/i],
  ['client', /\b(i'?m|i am|as) (a |an )?([\w ]{0,24})?(client|founder|business owner|startup owner)\b|\bneed (a |an )?(website|app|freelancer)\b/i],
  ['developer', /\b(i'?m|i am|as) (a |an )?([\w ]{0,24})?(developer|engineer|programmer)\b/i],
];
/** longest first, so "Spring Boot" is not also counted as "Spring" */
const KNOWN = [...SKILL_CATEGORIES.flatMap(c => c.skills.map(s => s.name)), ...PROJECTS.map(p => p.title)]
  .map(name => [fold(plainWords(name)), name] as const).sort((a, b) => b[0].length - a[0].length);

const fresh = (on = true): State => ({ on, role: null, interests: [], visits: 0, last: 0, topics: {} });

/** What a visitor says about themselves: only a role and names that exist on this site, never free text. */
export function learnFrom(text: string): { role: Role | null; interests: string[] } {
  let hay = ` ${fold(plainWords(text))} `;
  const interests: string[] = [];
  for (const [phrase, name] of KNOWN) {
    if (!hay.includes(` ${phrase} `)) continue;
    hay = hay.split(` ${phrase} `).join(' | ');
    interests.push(name);
  }
  return { role: ROLES.find(([, r]) => r.test(text))?.[0] ?? null, interests };
}

/** Remembers a visitor in their own browser only. Nothing here is uploaded, except the short note sent with a Gemini question. */
@Injectable({ providedIn: 'root' })
export class VisitorMemory {
  private readonly state = signal<State>(this.load());
  readonly on = computed(() => this.state().on);
  readonly role = computed(() => this.state().role);
  readonly interests = computed(() => [...this.state().interests].reverse());
  readonly topics = computed(() => this.state().topics);
  /** shown in the chat, so visitors can see exactly what is remembered */
  readonly summary = computed(() => [this.role(), ...this.interests(), ...(Object.keys(this.topics()).length ? ['interview scores'] : [])].filter(Boolean).join(', '));
  readonly returning: boolean;

  constructor() {
    const s = this.state();
    this.returning = s.on && s.visits > 0;
    let counted = false;
    try { counted = sessionStorage.getItem(SESSION) === '1'; sessionStorage.setItem(SESSION, '1'); } catch { /* storage unavailable */ }
    if (s.on && !counted) this.save({ ...s, visits: s.visits + 1, last: Date.now() });
  }

  learn(text: string) {
    const s = this.state();
    if (!s.on) return;
    const { role, interests } = learnFrom(text);
    if (!role && !interests.length) return;
    this.save({ ...s, role: role ?? s.role, interests: [...s.interests.filter(x => !interests.includes(x)), ...interests].slice(-MAX_INTERESTS) });
  }

  scored(key: string, score: number) {
    const s = this.state();
    if (!s.on) return;
    const t = s.topics[key] ?? { n: 0, avg: 0 };
    this.save({ ...s, topics: { ...s.topics, [key]: { n: t.n + 1, avg: (t.avg * t.n + score) / (t.n + 1) } } });
  }

  /** Extra context for the AI, or an empty string. */
  note(): string {
    const role = this.role(), xs = this.interests();
    if (!role && !xs.length) return '';
    return `[Remembered about this visitor: ${[role && `they are a ${role}`, xs.length && `asked before about ${xs.join(', ')}`].filter(Boolean).join('; ')}. Use it only if it helps.]`;
  }

  greeting(): string | null {
    if (!this.returning) return null;
    const x = this.interests()[0];
    return `Welcome back! ${x ? `Last time you asked about ${x}. Want to pick up there, or` : 'Want to'} try something new?`;
  }

  forget() {
    this.state.set(fresh(false));
    try { localStorage.setItem(KEY, JSON.stringify({ on: false })); } catch { /* storage unavailable */ }
  }

  remember() {
    this.save({ ...fresh(), visits: 1, last: Date.now() });
  }

  private save(s: State) {
    this.state.set(s);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
  }

  private load(): State {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (!v || typeof v !== 'object') return fresh();
      if (v.on === false) return fresh(false);
      const names = new Set(KNOWN.map(k => k[1]));
      const topics: Record<string, TopicScore> = {};
      for (const [k, t] of Object.entries((v.topics ?? {}) as Record<string, TopicScore>)) if (t && t.n > 0 && t.avg >= 0 && t.avg <= 10) topics[k] = { n: t.n, avg: t.avg };
      return {
        on: true, role: ROLES.find(([r]) => r === v.role)?.[0] ?? null,
        interests: (Array.isArray(v.interests) ? v.interests : []).filter((x: string) => names.has(x)).slice(-MAX_INTERESTS),
        visits: Number(v.visits) || 0, last: Number(v.last) || 0, topics,
      };
    } catch { return fresh(); }
  }
}
