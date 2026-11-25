import { Injectable, signal } from '@angular/core';
import { SemanticModel, embed, nearest, readModel } from './semantic';
import { STUDY_GUIDES } from '../data/study.data';

type Entry = [guide: string, topic: string, question: string];
export type Note = [question: string, answer: string];
export interface Chapter { key: string; title: string; group: string; guide: string; url: string; questions: number; }
export interface NoteHit { key: string; question: string; chapter: string; url: string; score: number; }

const STOP = new Set(['the', 'and', 'for', 'what', 'how', 'does', 'is', 'are', 'in', 'of', 'to', 'a', 'an', 'on', 'about', 'notes', 'note', 'question', 'questions', 'interview', 'chapter', 'with', 'me', 'show', 'find',
  'explain', 'tell', 'difference', 'between', 'why', 'when', 'do', 'you', 'can', 'i', 'it', 'use', 'used', 'your', 'kishore', 'his', 'he']);

/** Everyday words that also appear in the notes. A question made only of these is not about a technical topic. */
const COMMON = new Set(`there here anyone anybody someone something anything nothing everything everyone hear hello name names real human person people robot busy free doing done did does going gone come came get got give given take took make made makes
  see saw seen look looks looking say said says tell told talk ask asked answer answers know knows known think thinks want wants need needs like likes love help helps please sorry thanks thank okay ok yes no not never always maybe really very much many more most less few some any all each other another
  good great nice bad best better worse new old big small long short high low right wrong true same different happen happened happens start stop stopped wait run runs work works working try tried use day days time times today tomorrow yesterday now later soon week month year years hour minute
  one two three first second last next this that these those they them their we us our my mine he she him her who whom whose which where was were been being be am has have had will would can could should may might must shall if then else than but or so because just only also too up down out over under again back off
  happy sad sick tired bored hungry sleep eat food drink music movie game games song play weather rain hot cold home house city country india chennai money price cost buy sell friend family mother father brother sister test testing check hmm lol haha wow cool slow fast`.split(/\s+/));

export const CHAPTERS: Chapter[] = STUDY_GUIDES.flatMap(g => g.topics.map(t => ({ key: `${g.key}-${t.id}`, title: t.title, group: t.group, guide: g.short, url: `${g.file}#${t.id}`, questions: t.questions })));
const BY_KEY = new Map(CHAPTERS.map(c => [c.key, c]));
export const chapter = (key: string) => BY_KEY.get(key);

const tokens = (s: string): string[] => s.toLowerCase().match(/[a-z0-9+#.]+/g)?.map(w => w.replace(/\.+$/, '')) ?? [];
export const searchTerms = (q: string) => [...new Set(tokens(q).filter(t => t.length > 1 && !STOP.has(t)))];

export function searchNotes(index: Entry[], query: string, max = 8): NoteHit[] {
  const terms = searchTerms(query);
  if (!terms.length) return [];
  const score = (text: string) => {
    const ws = tokens(text);
    return terms.reduce((n, t) => n + (ws.includes(t) ? 2 : t.length > 2 && ws.some(w => w.startsWith(t)) ? 1 : 0), 0);
  };
  return index
    .map(([guide, id, question]) => {
      const c = BY_KEY.get(`${guide}-${id}`);
      const inQuestion = score(question) + (score(question) && /^(what (is|are)|explain)\b/i.test(question) ? 0.3 : 0);
      // a short question that is all about the terms beats a long one that merely mentions them
      return { key: c?.key ?? '', question, chapter: c?.title ?? '', url: c?.url ?? '', score: c ? 2 * inQuestion + score(c.title) - Math.min(1, tokens(question).length / 40) * (inQuestion ? 1 : 0) : 0 };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

/** The study notes: one small question index, plus one file of answers per chapter. All loaded only when needed. */
@Injectable({ providedIn: 'root' })
export class NotesService {
  private index?: Promise<Entry[]>;
  private chapters = new Map<string, Promise<Note[]>>();
  /** search by meaning is switched on and loaded */
  readonly semanticReady = signal(false);
  private semantic?: { model: SemanticModel; vectors: Int8Array };

  /** Downloads the 2 MB model. Only when the visitor asks. */
  async enableSemantic() {
    if (this.semantic) return;
    const file = async (f: string) => { const r = await fetch(`assets/study/semantic/${f}`); if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`); return r; };
    const [bin, vocab, notes] = await Promise.all([file('model.bin').then(r => r.arrayBuffer()), file('vocab.txt').then(r => r.text()), file('notes.bin').then(r => r.arrayBuffer())]);
    const model = readModel(bin, vocab), vectors = new Int8Array(notes);
    const index = await this.entries();
    if (vectors.length !== index.length * model.dim) throw new Error('notes.bin is out of date: run npm run notes');
    this.semantic = { model, vectors };
    this.semanticReady.set(true);
  }

  /** Notes close in meaning, best first. Empty unless it is switched on. */
  async byMeaning(query: string, max = 4): Promise<(NoteHit & { answer: string })[]> {
    if (!this.semantic) return [];
    const index = await this.entries();
    const near = nearest(embed(query, this.semantic.model), this.semantic.vectors, max + 4).filter(n => n.score >= 0.6);
    const out: (NoteHit & { answer: string })[] = [];
    for (const { i, score } of near) {
      const [guide, id, question] = index[i];
      const c = BY_KEY.get(`${guide}-${id}`);
      const answer = c ? ((await this.notes(c.key).catch(() => [])).find(([q]) => q === question)?.[1] ?? '') : '';
      if (c && answer && out.length < max) out.push({ key: c.key, question, chapter: c.title, url: c.url, score, answer });
    }
    return out;
  }

  private entries(): Promise<Entry[]> {
    this.index ??= this.get<Entry[]>('search-index.json').catch(e => { this.index = undefined; throw e; });
    return this.index;
  }


  async search(query: string, max = 8): Promise<NoteHit[]> {
    return searchNotes(await this.entries(), query, max);
  }

  notes(key: string): Promise<Note[]> {
    if (!BY_KEY.has(key)) return Promise.resolve([]);
    let p = this.chapters.get(key);
    if (!p) {
      p = this.get<Note[]>(`notes/${key}.json`).catch(e => { this.chapters.delete(key); throw e; });
      this.chapters.set(key, p);
    }
    return p;
  }

  /** The best-matching questions with their answers. */
  async passages(query: string, max = 4): Promise<(NoteHit & { answer: string })[]> {
    const hits = await this.search(query, max + 2);
    const found = await Promise.all(hits.map(async h => ({ ...h, answer: (await this.notes(h.key)).find(([q]) => q === h.question)?.[1] ?? '' })));
    const words = found.filter(h => h.answer);
    // when search by meaning is on, take turns: its best, then the best by words
    const meaning = await this.byMeaning(query, max).catch(() => []);
    const mixed: typeof words = [];
    for (let i = 0; i < Math.max(words.length, meaning.length); i++) for (const h of [words[i], meaning[i]]) if (h && !mixed.some(m => m.key === h.key && m.question === h.question)) mixed.push(h);
    return mixed.slice(0, max);
  }

  /** A quote from the notes, only when every word of the question is covered. No AI. */
  async quote(query: string): Promise<{ text: string; chapter: string; url: string } | null> {
    const terms = searchTerms(query);
    if (!terms.some(t => !COMMON.has(t))) return null; // nothing technical was asked
    const best = (await this.passages(query, 3)).find(h => { const ws = tokens(`${h.question} ${h.chapter}`); return terms.every(t => ws.some(w => w.startsWith(t))); });
    if (!best) return null;
    const prose = best.answer.split('\n').filter(l => /[a-z]{3}/i.test(l) && !/[{};|]\s*$|^\s*(\/\/|@)/.test(l)).join(' ').replace(/(^| )- /g, ' ').replace(/\s+/g, ' ').trim();
    if (prose.length < 20) return null;
    const cut = prose.length <= 420 ? prose : prose.slice(0, 420).replace(/[^.!?]*$/, '').trim() || prose.slice(0, 400).trim() + '…';
    return { text: `From the ${best.chapter} notes: ${cut}`, chapter: best.chapter, url: best.url };
  }

  private async get<T>(file: string): Promise<T> {
    const r = await fetch(`assets/study/${file}`);
    if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
    return r.json() as Promise<T>;
  }
}
