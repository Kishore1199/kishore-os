import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Icon } from '../core/icon';
import { SkillIcon } from '../core/skill-icon';
import { SKILL_CATEGORIES } from '../data/portfolio.data';

@Component({
  selector: 'app-skills',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, SkillIcon],
  template: `
    <div class="wrap">
      <div class="head">
        <div class="tabs">
          <button type="button" [class.on]="cat() === ''" (click)="cat.set('')">All <small>{{ total }}</small></button>
          @for (c of cats; track c.name) { <button type="button" [class.on]="cat() === c.name" (click)="cat.set(c.name)"><app-icon [name]="c.icon" [size]="13" /> {{ c.name }}</button> }
        </div>
        <label class="find"><app-icon name="search" [size]="14" /><input [value]="q()" (input)="q.set($any($event.target).value)" placeholder="Filter…" aria-label="Filter skills" /></label>
      </div>
      @for (c of shown(); track c.name) {
        <section>
          <h3>{{ c.name }} <small>{{ c.blurb }}</small></h3>
          <div class="tiles">
            @for (s of c.skills; track s.name) {
              <div class="tile" [style.--c]="s.color"><app-skill-icon [name]="s.name" [color]="s.color" [size]="28" /><span>{{ s.name }}</span></div>
            }
          </div>
        </section>
      } @empty { <p class="none mono">No skill matches "{{ q() }}"</p> }
    </div>
  `,
  styles: `
    .wrap { padding: 22px; display: grid; gap: 20px; }
    .head { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; }
    .tabs { display: flex; flex-wrap: wrap; gap: 6px; }
    .tabs button { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line-2); background: none; cursor: pointer; font-size: 0.8rem; font-weight: 600; color: var(--ink-2); }
    .tabs button.on { color: #fff; border-color: transparent; background: linear-gradient(135deg, var(--violet), var(--accent)); }
    .tabs small { opacity: 0.7; font-family: var(--mono); }
    .find { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line-2); color: var(--ink-3); }
    .find input { width: 140px; border: 0; outline: 0; background: none; color: var(--ink); }
    h3 { font-size: 1.15rem; margin-bottom: 10px; }
    h3 small { font: 400 0.8rem 'Inter', sans-serif; color: var(--ink-3); margin-left: 8px; }
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; }
    .tile { display: grid; justify-items: center; gap: 8px; padding: 16px 8px 12px; border-radius: 16px; text-align: center; font-size: 0.8rem; font-weight: 600;
      border: 1px solid var(--line); background: linear-gradient(180deg, color-mix(in srgb, var(--c) 12%, transparent), transparent); transition: transform 0.2s, border-color 0.2s; }
    .tile:hover { transform: translateY(-3px) rotate(-1deg); border-color: var(--c); }
    .none { color: var(--ink-3); }
  `,
})
export class Skills {
  protected readonly cats = SKILL_CATEGORIES;
  protected readonly total = SKILL_CATEGORIES.reduce((n, c) => n + c.skills.length, 0);
  protected readonly cat = signal('');
  protected readonly q = signal('');
  protected readonly shown = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.cats.filter(c => !this.cat() || c.name === this.cat())
      .map(c => ({ ...c, skills: c.skills.filter(s => !q || s.name.toLowerCase().includes(q)) }))
      .filter(c => c.skills.length);
  });
}
