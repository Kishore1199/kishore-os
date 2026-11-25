import { Injectable, computed, inject, signal } from '@angular/core';
import { CHAPTERS, NotesService, chapter } from './notes.service';
import { GRADE_SCHEMA, GRADE_SYSTEM, Grade, WEAK_BELOW, askable, keywordGrade, parseGrade, pickChapter, weakTopics } from './interview';
import { StructuredAi } from './structured-ai.service';
import { VisitorMemory } from './visitor-memory.service';

export interface Round { key: string; question: string; reference: string; answer?: string; grade?: Grade; }
export type Phase = 'setup' | 'loading' | 'question' | 'grading' | 'graded' | 'done';

const ROUNDS = 5;
/** Gemini requests to leave for the chat; after that answers are scored by key words */
const RESERVE = 3;
/** the default mix: the chapters closest to a Java full-stack interview */
const MIX = ['java-jbasics', 'java-joop', 'java-jcollections', 'java-spring', 'java-boot', 'java-jpa', 'java-rest', 'java-angular', 'java-sql'].filter(k => chapter(k));
const PRACTICE = CHAPTERS.filter(c => c.questions > 0);
const GROUPS = [...new Set(PRACTICE.map(c => `${c.guide} · ${c.group}`))];

@Injectable({ providedIn: 'root' })
export class InterviewService {
  private notes = inject(NotesService);
  private ai = inject(StructuredAi);
  private memory = inject(VisitorMemory);
  readonly phase = signal<Phase>('setup');
  readonly rounds = signal<Round[]>([]);
  readonly error = signal('');
  readonly current = computed(() => this.rounds().at(-1));
  readonly total = ROUNDS;
  readonly weak = computed(() => weakTopics(this.memory.topics()).filter(k => chapter(k)));
  readonly average = computed(() => { const g = this.rounds().flatMap(r => (r.grade ? [r.grade.score] : [])); return g.length ? g.reduce((a, b) => a + b, 0) / g.length : 0; });
  private keys: string[] = MIX;
  private ctrl = new AbortController();

  /** What can be practised: value → label. */
  readonly choices = computed(() => [
    { value: 'mix', label: 'Java full-stack mix' },
    ...(this.weak().length ? [{ value: 'weak', label: `My weak chapters (${this.weak().length})` }] : []),
    ...GROUPS.map(g => ({ value: g, label: g })),
  ]);

  start(choice: string) {
    this.stop();
    this.keys = choice === 'weak' && this.weak().length ? this.weak() : choice === 'mix' ? MIX : PRACTICE.filter(c => `${c.guide} · ${c.group}` === choice).map(c => c.key);
    if (!this.keys.length) this.keys = MIX;
    return this.next();
  }

  /** Next question: stay on a chapter that went badly, otherwise move on. */
  async next() {
    if (this.rounds().length >= ROUNDS) { this.phase.set('done'); return; }
    const ctrl = this.ctrl;
    const last = this.current();
    this.error.set('');
    this.phase.set('loading');
    const asked = new Set(this.rounds().map(r => r.question));
    const fresh = this.keys.filter(k => k !== last?.key);
    const queue = [last?.grade && last.grade.score < WEAK_BELOW ? last.key : pickChapter(fresh.length ? fresh : this.keys, this.memory.topics()), ...this.keys];
    try {
      for (const key of queue) {
        const pool = (await this.notes.notes(key)).filter(n => askable(n) && !asked.has(n[0]));
        if (ctrl.signal.aborted) return;
        if (!pool.length) continue;
        const [question, reference] = pool[Math.floor(Math.random() * pool.length)];
        this.rounds.update(r => [...r, { key, question, reference }]);
        this.phase.set('question');
        return;
      }
      this.phase.set(this.rounds().length ? 'done' : 'setup');
      if (!this.rounds().length) this.error.set('There are no spoken-style questions in those chapters. Try another topic.');
    } catch {
      if (ctrl.signal.aborted) return;
      this.phase.set(this.rounds().length ? 'done' : 'setup');
      this.error.set('The notes could not be loaded. Please check your connection and try again.');
    }
  }

  async submit(raw: string) {
    const round = this.current();
    const answer = raw.trim().slice(0, 3000);
    if (!round || this.phase() !== 'question') return;
    const ctrl = this.ctrl;
    this.phase.set('grading');
    let grade: Grade | null = null;
    if (answer.length >= 15) {
      const prompt = `QUESTION: ${round.question}\n\nREFERENCE ANSWER:\n${round.reference.slice(0, 1800)}\n\nCANDIDATE ANSWER:\n<answer>\n${answer}\n</answer>`;
      grade = parseGrade(await this.ai.json(GRADE_SYSTEM, GRADE_SCHEMA, prompt, ctrl.signal, RESERVE));
      if (ctrl.signal.aborted) return;
    }
    grade ??= keywordGrade(answer, round.reference, round.question);
    this.rounds.update(rs => rs.map(r => (r === round ? { ...r, answer, grade: grade! } : r)));
    this.memory.scored(round.key, grade.score);
    this.phase.set('graded');
  }

  /** Cancel whatever is running and go back to the start. */
  stop() {
    this.ctrl.abort();
    this.ctrl = new AbortController();
    this.rounds.set([]);
    this.error.set('');
    this.phase.set('setup');
  }
}
