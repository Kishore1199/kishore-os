import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '../core/icon';
import { KaiService } from '../core/kai.service';
import { SkillIcon } from '../core/skill-icon';
import { baseSkillName } from '../core/skill-meta';
import { EDUCATION, EXPERIENCE, RESPONSIBILITIES } from '../data/portfolio.data';

@Component({
  selector: 'app-experience',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, SkillIcon],
  template: `
    <div class="wrap">
      <p class="kicker">Work</p>
      <ol class="tl">
        @for (e of jobs; track e.company) {
          <li [class.now]="e.current">
            <span class="node">{{ e.initials }}</span>
            <div class="card">
              <div class="top">
                <div><h3>{{ e.role }}</h3><p class="co">{{ e.company }}</p></div>
                <span class="when mono">{{ e.period }} · {{ e.duration }}@if (e.current) { <i>● now</i> }</span>
              </div>
              <p class="sum">{{ e.summary }}</p>
              <p class="pj"><b>Projects:</b> {{ e.projects.join(' · ') }}</p>
              <div class="tech">@for (t of e.tech; track t) { <span class="chip"><app-skill-icon [name]="base(t)" [size]="12" color="currentColor" /> {{ t }}</span> }</div>
              @if (e.current) {
                <ul class="duty">@for (r of duties; track r) { <li><app-icon name="check" [size]="13" /> {{ r }}</li> }</ul>
              }
              <button type="button" class="say" (click)="kai.explain('experience', e.role + ' at ' + e.company + ', ' + e.period.replace('–', 'to') + '. ' + e.summary)" aria-label="Listen to this role">
                <app-icon name="volume" [size]="13" />
              </button>
            </div>
          </li>
        }
      </ol>

      <p class="kicker">Education</p>
      <div class="edu">
        @for (d of edu; track d.short) {
          <div class="ed" [style.--c]="d.accent" [style.--c2]="d.accent2">
            <span class="badge">{{ d.short }}</span>
            <b>{{ d.degree }}</b>
            <small>{{ d.institution }}</small>
            <div class="meter"><i [style.width.%]="d.score"></i></div>
            <span class="mono g">{{ d.period }} · {{ d.grade }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .wrap { padding: 26px; display: grid; gap: 16px; }
    .tl { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; position: relative; }
    .tl::before { content: ''; position: absolute; left: 21px; top: 10px; bottom: 10px; width: 2px; background: linear-gradient(var(--accent), var(--violet), transparent); }
    li { display: flex; gap: 16px; }
    .node { position: relative; z-index: 1; width: 44px; height: 44px; flex-shrink: 0; border-radius: 14px; display: grid; place-items: center; font: 800 0.8rem var(--display); color: #fff; background: linear-gradient(135deg, var(--violet), var(--accent)); }
    li.now .node { box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent) 25%, transparent); }
    .card { position: relative; flex: 1; padding: 18px; border-radius: 18px; background: var(--glass-2); border: 1px solid var(--line); }
    .top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding-right: 30px; }
    h3 { font-size: 1.25rem; }
    .co { color: var(--accent); font-weight: 600; }
    .when { font-size: 0.74rem; color: var(--ink-3); }
    .when i { font-style: normal; color: var(--teal); margin-left: 6px; }
    .sum { margin-top: 10px; color: var(--ink-2); font-size: 0.92rem; }
    .pj { margin: 10px 0; font-size: 0.86rem; color: var(--ink-2); }
    .pj b { color: var(--ink); }
    .tech { display: flex; flex-wrap: wrap; gap: 6px; }
    .duty { list-style: none; padding: 12px 0 0; margin: 12px 0 0; border-top: 1px solid var(--line); display: grid; gap: 6px; font-size: 0.86rem; color: var(--ink-2); }
    .duty li { display: flex; gap: 8px; }
    .duty app-icon { color: var(--teal); margin-top: 3px; }
    .say { position: absolute; right: 12px; top: 12px; width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--line-2); background: none; cursor: pointer; display: grid; place-items: center; }
    .say:hover { color: var(--teal); border-color: var(--teal); }
    .edu { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .ed { padding: 16px; border-radius: 18px; display: grid; gap: 6px; border: 1px solid var(--line); background: linear-gradient(160deg, color-mix(in srgb, var(--c) 16%, transparent), transparent 70%); }
    .badge { justify-self: start; padding: 3px 10px; border-radius: 999px; font: 700 0.7rem var(--mono); color: #fff; background: linear-gradient(135deg, var(--c), var(--c2)); }
    .ed small { color: var(--ink-3); font-size: 0.78rem; }
    .meter { height: 6px; border-radius: 6px; background: var(--line); overflow: hidden; }
    .meter i { display: block; height: 100%; background: linear-gradient(90deg, var(--c), var(--c2)); }
    .g { font-size: 0.72rem; color: var(--ink-2); }
    @media (max-width: 700px) { .wrap { padding: 16px; } .edu { grid-template-columns: 1fr; } }
  `,
})
export class Experience {
  protected readonly kai = inject(KaiService);
  protected readonly jobs = EXPERIENCE;
  protected readonly duties = RESPONSIBILITIES;
  protected readonly edu = [...EDUCATION].reverse();
  protected base(t: string) {
    return baseSkillName(t);
  }
}
