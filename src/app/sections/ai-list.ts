import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Icon } from '../core/icon';
import { AI_FEATURES, AI_GROUPS, AiFeature, AiGroup, RUNS_LABEL } from '../data/ai-features.data';
import { AiLauncher } from './ai-launcher.service';

@Component({
  selector: 'app-ai-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, NgTemplateOutlet],
  template: `
    <div class="bar">
      <label class="search"><app-icon name="search" [size]="15" /><input type="search" placeholder="Find an AI option…" aria-label="Find an AI option" [value]="query()" (input)="query.set($any($event.target).value)" /></label>
      <div class="tabs" role="group" aria-label="Groups">
        <button type="button" [attr.aria-pressed]="!group()" (click)="group.set(null)">All <small>{{ total }}</small></button>
        @for (g of groups; track g.name) { <button type="button" [attr.aria-pressed]="group() === g.name" (click)="group.set(g.name)">{{ g.name }} <small>{{ g.n }}</small></button> }
      </div>
    </div>
    @for (g of shown(); track g.name) {
      <h3>{{ g.name }}</h3>
      <ul>
        @for (x of g.items; track x.title) {
          <li>
            @if (x.action) {
              <button type="button" class="card" (click)="run(x)"><ng-container [ngTemplateOutlet]="face" [ngTemplateOutletContext]="{ $implicit: x }" /></button>
            } @else { <div class="card still"><ng-container [ngTemplateOutlet]="face" [ngTemplateOutletContext]="{ $implicit: x }" /></div> }
          </li>
        }
      </ul>
    } @empty { <p class="none">Nothing matches "{{ query() }}".</p> }
    <ng-template #face let-x>
      <span class="ico"><app-icon [name]="x.icon" [size]="17" /></span>
      <span class="t"><b>{{ x.title }}</b><span>{{ x.text }}</span><small [class]="x.runs">{{ label(x) }}{{ x.action ? '' : ' · always on' }}</small></span>
    </ng-template>
  `,
  styles: `
    .bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 10px; }
    .search { flex: 1 1 240px; display: flex; align-items: center; gap: 9px; padding: 0 14px; height: 44px; border-radius: 13px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-2); }
    .search:focus-within { border-color: var(--accent); } .search input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; color: var(--text); font: inherit; font-size: 0.9rem; }
    .tabs { display: flex; flex-wrap: wrap; gap: 6px; } .tabs button { padding: 9px 14px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-2); font-size: 0.82rem; font-weight: 600; cursor: pointer; }
    .tabs button[aria-pressed='true'] { color: var(--bg); background: var(--text); border-color: var(--text); } .tabs small { opacity: 0.85; }
    h3 { font-size: 1.15rem; margin: 30px 0 14px; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 265px), 1fr)); gap: 12px; } li { display: grid; }
    .card { display: flex; gap: 13px; align-items: flex-start; text-align: left; padding: 16px; border-radius: 16px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font: inherit; width: 100%; }
    button.card { cursor: pointer; transition: border-color 0.2s, transform 0.2s; } button.card:hover { border-color: var(--accent); transform: translateY(-2px); } .still { border-style: dashed; }
    .ico { flex-shrink: 0; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 11px; color: var(--accent); background: var(--accent-soft); }
    .t { display: grid; gap: 3px; min-width: 0; } .t b { font-size: 0.94rem; } .t > span { font-size: 0.82rem; color: var(--text-2); line-height: 1.45; }
    .t small { margin-top: 4px; font: 500 0.68rem 'JetBrains Mono', monospace; color: var(--text-2); }
    .none { padding: 30px 0; color: var(--text-2); }
    @media (prefers-reduced-motion: reduce) { button.card:hover { transform: none; } }
  `,
})
export class AiList {
  private launcher = inject(AiLauncher);
  protected readonly label = (x: AiFeature) => RUNS_LABEL[x.runs];
  protected readonly total = AI_FEATURES.length;
  protected readonly groups = AI_GROUPS.map(name => ({ name, n: AI_FEATURES.filter(f => f.group === name).length }));
  protected readonly query = signal('');
  protected readonly group = signal<AiGroup | null>(null);
  protected readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase();
    return AI_GROUPS.filter(g => !this.group() || g === this.group())
      .map(name => ({ name, items: AI_FEATURES.filter(f => f.group === name && (!q || `${f.title} ${f.text} ${RUNS_LABEL[f.runs]}`.toLowerCase().includes(q))) }))
      .filter(g => g.items.length);
  });

  protected run(f: AiFeature) {
    this.launcher.run(f);
  }
}
