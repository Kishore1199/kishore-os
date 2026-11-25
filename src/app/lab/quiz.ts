import { Note } from '../core/notes.service';

export interface QuizItem { question: string; options: string[]; answer: number; why: string; }

/** First sentence of an answer, when it works as a quiz option. */
export function firstPoint(answer: string): string {
  const line = answer.split('\n').map(l => l.replace(/^- /, '').trim()).find(l => l.length >= 25 && !/[{};|]\s*$/.test(l) && /[a-z]{3}/.test(l)) ?? '';
  const s = line.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? line;
  return s.length >= 25 && s.length <= 170 ? s : '';
}

export function shuffle<T>(xs: readonly T[], random = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Multiple choice from the notes: the wrong options are answers to other questions in the same chapter. */
export function notesQuiz(notes: readonly Note[], count = 5, random = Math.random): QuizItem[] {
  const pool = notes.map(([question, a]) => ({ question, point: firstPoint(a), why: a }))
    .filter(n => n.point && n.question.length <= 150 && !/predict the output|write (a|the)|problem:/i.test(n.question));
  return shuffle(pool, random).slice(0, count).flatMap(n => {
    const others = [...new Set(shuffle(pool, random).map(o => o.point))].filter(p => p !== n.point).slice(0, 3);
    if (others.length < 3) return [];
    const options = shuffle([n.point, ...others], random);
    return [{ question: n.question, options, answer: options.indexOf(n.point), why: n.why.slice(0, 500) }];
  });
}

export const QUIZ_SYSTEM = `Write a multiple-choice quiz from the study notes given. One question per note, 4 short options of similar length, exactly one correct. Wrong options must be plausible but clearly wrong according to the note. "why" is one sentence from the note. Use only the notes. Return only JSON that matches the schema.`;
export const QUIZ_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: { items: { type: 'array', maxItems: 5, items: { type: 'object', properties: { question: { type: 'string' }, options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 }, answer: { type: 'integer', minimum: 0, maximum: 3 }, why: { type: 'string' } }, required: ['question', 'options', 'answer', 'why'] } } },
  required: ['items'],
};
export function parseQuiz(raw: unknown): QuizItem[] {
  const str = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
  const items = (raw as { items?: unknown } | null)?.items;
  return (Array.isArray(items) ? items : []).flatMap(i => {
    const options = (Array.isArray(i?.options) ? i.options : []).map((o: unknown) => str(o, 200)).filter(Boolean);
    const question = str(i?.question, 250);
    return question && options.length === 4 && new Set(options).size === 4 && Number.isInteger(i.answer) && i.answer >= 0 && i.answer < 4 ? [{ question, options, answer: i.answer, why: str(i.why, 400) }] : [];
  }).slice(0, 5);
}
