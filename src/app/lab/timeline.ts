import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { EDUCATION, EXPERIENCE, PROJECTS } from '../data/portfolio.data';

type Kind = 'Education' | 'Job' | 'Project';
interface Item { kind: Kind; title: string; where: string; when: string; order: number; points: string[]; }

/** "Dec 2024 – Present" → 2024.92; undated work sits between the degree and the first dated job */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const start = (p: string, undated: number) => { const m = p.match(/(?:([A-Za-z]{3})\w*\s+)?(\d{4})/); return m ? Number(m[2]) + (m[1] ? MONTHS.indexOf(m[1].toLowerCase()) / 12 : 0) : undated; };
const UNDATED = 2024;
const ITEMS: Item[] = [
  ...EDUCATION.map(e => ({ kind: 'Education' as const, title: e.degree, where: e.institution, when: e.period, order: start(e.period, 0), points: [e.description, `Result: ${e.grade}`] })),
  ...EXPERIENCE.map(e => ({ kind: 'Job' as const, title: e.role, where: e.company, when: /\d{4}/.test(e.period) ? `${e.period} · ${e.duration}` : `${e.duration}, dates not listed`, order: start(e.period, UNDATED), points: [e.summary, `Technology: ${e.tech.join(', ')}`] })),
  ...PROJECTS.map((p, i) => ({ kind: 'Project' as const, title: p.title, where: p.org, when: /\d{4}/.test(p.period) ? p.period : `${p.period}, dates not listed`, order: start(p.period, UNDATED) + 0.01 + i / 1000, points: [...p.features.slice(0, 4), `Technology: ${p.tech.join(', ')}`] })),
].sort((a, b) => a.order - b.order);

@Component({
  selector: 'app-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="f" role="group" aria-label="Filter">@for (k of kinds; track k) { <button type="button" [attr.aria-pressed]="kind() === k" (click)="kind.set(k)">{{ k }}</button> }
      <button type="button" class="flip" (click)="newest.set(!newest())">{{ newest() ? 'Newest first' : 'Oldest first' }}</button></div>
    <ol>
      @for (i of items(); track i.title) {
        <li [class]="i.kind.toLowerCase()"><small>{{ i.when }}</small>
          <details><summary><b>{{ i.title }}</b><span>{{ i.kind }} · {{ i.where }}</span></summary><ul>@for (p of i.points; track p) { <li>{{ p }}</li> }</ul></details>
        </li>
      }
    </ol>
  `,
  styles: `
    :host { display: grid; gap: 14px; }
    .f { display: flex; flex-wrap: wrap; gap: 6px; } .f button { padding: 6px 13px; border-radius: 999px; border: 1px solid var(--border-strong); background: none; color: var(--text-2); font-size: 0.8rem; cursor: pointer; }
    .f button[aria-pressed='true'] { color: var(--bg); background: var(--text); border-color: var(--text); } .flip { margin-left: auto; }
    ol { list-style: none; margin: 0; padding: 0 0 0 18px; border-left: 2px solid var(--border-strong); display: grid; gap: 12px; }
    ol > li { position: relative; } ol > li::before { content: ''; position: absolute; left: -25px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--c); } .education { --c: #f59e0b; } .job { --c: #10b981; } .project { --c: #8b5cf6; }
    small { font-size: 0.74rem; color: var(--text-2); } summary { cursor: pointer; padding: 4px 0; font-size: 0.92rem; } summary span { display: block; font-size: 0.8rem; color: var(--text-2); } details ul { margin: 6px 0 0; padding-left: 18px; font-size: 0.84rem; color: var(--text-2); display: grid; gap: 4px; }
  `,
})
export class Timeline {
  protected readonly kinds = ['All', 'Education', 'Job', 'Project'] as const;
  protected readonly kind = signal<'All' | Kind>('All');
  protected readonly newest = signal(true);
  protected readonly items = computed(() => { const xs = ITEMS.filter(i => this.kind() === 'All' || i.kind === this.kind()); return this.newest() ? [...xs].reverse() : xs; });
}
