import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CHAPTERS, chapter } from '../core/notes.service';
import { LabService } from './lab.service';
import { QuizItem } from './quiz';

@Component({
  selector: 'app-quiz',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!items().length) {
      <label for="qz">Chapter</label>
      <select id="qz" #sel>@for (g of groups; track g.name) { <optgroup [label]="g.name">@for (c of g.chapters; track c.key) { <option [value]="c.key">{{ c.title }}</option> }</optgroup> }</select>
      <div class="row">
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="load(sel.value, false)">Quiz from the notes</button>
        <button type="button" class="btn btn-ghost" [disabled]="busy()" (click)="load(sel.value, true)">Written by AI</button>
      </div>
      @if (busy()) { <p role="status">Preparing questions…</p> }
      @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
    } @else {
      <p>{{ title() }} · {{ ai() ? 'written by AI from the notes' : 'from the notes' }} · {{ right() }} of {{ answered() }} right</p>
      @for (q of items(); track $index; let i = $index) {
        <fieldset [disabled]="picks()[i] !== undefined">
          <legend>{{ i + 1 }}. {{ q.question }}</legend>
          @for (o of q.options; track $index; let j = $index) {
            <button type="button" class="opt" [class.right]="picks()[i] !== undefined && j === q.answer" [class.wrong]="picks()[i] === j && j !== q.answer" (click)="pick(i, j)">{{ o }}@if (picks()[i] !== undefined && j === q.answer) { <small> Correct</small> } @else if (picks()[i] === j) { <small> Your answer</small> }</button>
          }
          @if (picks()[i] !== undefined && q.why) { <p class="why">{{ q.why }}</p> }
        </fieldset>
      }
      <div class="row"><button type="button" class="btn btn-ghost" (click)="items.set([])">New quiz</button><a [href]="url()" target="_blank" rel="noopener">Open the chapter</a></div>
    }
  `,
  styles: `
    :host { display: grid; gap: 14px; } label, p { font-size: 0.86rem; color: var(--text-2); } .err { color: var(--bad, #ef4444); }
    select { width: 100%; padding: 12px 14px; font: inherit; font-size: 0.88rem; color: var(--text); background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 14px; } option, optgroup { background: var(--surface-solid); color: var(--text); }
    .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; } .row .btn { padding: 9px 16px; font-size: 0.84rem; } a { color: var(--accent); font-size: 0.84rem; }
    fieldset { margin: 0; padding: 14px; border: 1px solid var(--border); border-radius: 16px; display: grid; gap: 8px; min-width: 0; } legend { float: left; width: 100%; font-weight: 600; font-size: 0.92rem; color: var(--text); margin-bottom: 4px; }
    .opt { text-align: left; padding: 10px 13px; border-radius: 12px; border: 1px solid var(--border-strong); background: none; color: var(--text-2); font: inherit; font-size: 0.85rem; cursor: pointer; overflow-wrap: anywhere; } .opt:hover:enabled { border-color: var(--accent); }
    .opt.right { border-color: #10b981; color: var(--text); background: rgba(16, 185, 129, 0.12); } .opt.wrong { border-color: #ef4444; color: var(--text); background: rgba(239, 68, 68, 0.12); } .opt small { font-weight: 700; } .why { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 0.8rem; }
  `,
})
export class QuizView {
  private lab = inject(LabService);
  protected readonly groups = [...new Set(CHAPTERS.map(c => `${c.guide} · ${c.group}`))].map(name => ({ name, chapters: CHAPTERS.filter(c => `${c.guide} · ${c.group}` === name && c.questions >= 8) })).filter(g => g.chapters.length);
  protected readonly items = signal<QuizItem[]>([]);
  protected readonly picks = signal<Record<number, number>>({});
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly ai = signal(false);
  private readonly key = signal('');
  protected readonly title = computed(() => chapter(this.key())?.title ?? '');
  protected readonly url = computed(() => chapter(this.key())?.url ?? '');
  protected readonly answered = computed(() => Object.keys(this.picks()).length);
  protected readonly right = computed(() => this.items().filter((q, i) => this.picks()[i] === q.answer).length);

  protected async load(key: string, ai: boolean) {
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await this.lab.quiz(key, ai);
      this.key.set(key);
      this.picks.set({});
      this.ai.set(r.ai);
      this.items.set(r.items);
      if (!r.items.length) this.error.set('That chapter has too few short answers for a quiz. Try another one.');
    } catch { this.error.set('The notes could not be loaded.'); }
    this.busy.set(false);
  }

  protected pick(i: number, j: number) {
    this.picks.update(p => (p[i] === undefined ? { ...p, [i]: j } : p));
  }
}
