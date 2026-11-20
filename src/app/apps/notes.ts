import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Icon } from '../core/icon';
import { STUDY_GUIDES, StudyTopic } from '../data/study.data';

/** Interview-prep library: every chapter one click away, grouped by area, with search. */
@Component({
  selector: 'app-notes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="wrap">
      <div class="head">
        <div class="seg">
          @for (g of guides; track g.key) {
            <button type="button" [class.on]="gk() === g.key" (click)="gk.set(g.key)"><app-icon [name]="g.icon" [size]="14" /> {{ g.short }} <small>{{ g.topics.length }}</small></button>
          }
        </div>
        <label class="find"><app-icon name="search" [size]="14" /><input [value]="q()" (input)="q.set($any($event.target).value)" placeholder="JWT, Kafka, DP…" aria-label="Find a chapter" /></label>
        <a class="btn hot sm" [href]="guide().file" target="_blank" rel="noopener"><app-icon name="book-open" [size]="14" /> Open full guide</a>
      </div>
      <div class="cols">
        @for (gr of groups(); track gr.name) {
          <section>
            <h3>{{ gr.name }}</h3>
            @for (t of gr.topics; track t.id) {
              <a [href]="guide().file + '#' + t.id" target="_blank" rel="noopener"><span>{{ t.title }}</span>@if (t.isNew) { <em>new</em> }<small class="mono">{{ t.questions }}</small></a>
            }
          </section>
        } @empty { <p class="none mono">No chapter matches "{{ q() }}"</p> }
      </div>
    </div>
  `,
  styles: `
    .wrap { padding: 22px; display: grid; gap: 18px; }
    .head { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .seg { display: flex; padding: 4px; border-radius: 12px; background: var(--glass-2); border: 1px solid var(--line); }
    .seg button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px; border: 0; background: none; cursor: pointer; font-size: 0.82rem; font-weight: 600; color: var(--ink-2); }
    .seg button.on { color: #fff; background: linear-gradient(135deg, var(--violet), var(--accent)); }
    .seg small { opacity: 0.7; font-family: var(--mono); }
    .find { flex: 1; min-width: 160px; display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--line-2); color: var(--ink-3); }
    .find input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; color: var(--ink); }
    .sm { padding: 8px 14px; font-size: 0.8rem; }
    .cols { columns: 3 250px; column-gap: 14px; }
    section { break-inside: avoid; margin-bottom: 14px; padding: 14px; border-radius: 16px; background: var(--glass-2); border: 1px solid var(--line); }
    h3 { font-size: 1rem; margin-bottom: 6px; }
    a { display: flex; align-items: center; gap: 6px; padding: 6px 8px; margin: 0 -8px; border-radius: 9px; text-decoration: none; font-size: 0.88rem; }
    a:hover { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); }
    a span { flex: 1; }
    em { font: 700 0.6rem var(--mono); font-style: normal; text-transform: uppercase; color: var(--teal); }
    a small { color: var(--ink-3); font-size: 0.7rem; }
    .none { color: var(--ink-3); }
  `,
})
export class Notes {
  protected readonly guides = STUDY_GUIDES;
  protected readonly gk = signal(STUDY_GUIDES[0].key);
  protected readonly q = signal('');
  protected readonly guide = computed(() => this.guides.find(g => g.key === this.gk())!);
  protected readonly groups = computed(() => {
    const q = this.q().trim().toLowerCase();
    const out: { name: string; topics: StudyTopic[] }[] = [];
    for (const t of this.guide().topics) {
      if (q && !(t.title.toLowerCase().includes(q) || t.group.toLowerCase().includes(q) || t.quiz.some(x => x.toLowerCase().includes(q)))) continue;
      let g = out.find(x => x.name === t.group);
      if (!g) out.push((g = { name: t.group, topics: [] }));
      g.topics.push(t);
    }
    return out;
  });
}
