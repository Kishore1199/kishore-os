import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Icon } from '../core/icon';
import { KaiService } from '../core/kai.service';
import { projectStory } from '../core/kai.brain';
import { OsService } from '../core/os.service';
import { SkillIcon } from '../core/skill-icon';
import { baseSkillName } from '../core/skill-meta';
import { PROJECTS } from '../data/portfolio.data';

/** Finder-style project browser: sidebar list + detail with a browser-framed screenshot. */
@Component({
  selector: 'app-projects',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, SkillIcon],
  template: `
    <div class="split">
      <aside>
        <p class="kicker side">All projects · {{ list.length }}</p>
        @for (p of list; track p.title) {
          <button type="button" [class.on]="cur().title === p.title" [style.--c]="p.accent" (click)="pick.set(p.title)">
            <span class="sw"></span>
            <span class="t"><b>{{ p.title }}</b><small>{{ p.badge }} · {{ p.org }}</small></span>
          </button>
        }
      </aside>

      @let p = cur();
      <article [style.--c]="p.accent" [style.--c2]="p.accent2">
        <div class="shot">
          @if (p.image) {
            <div class="frame">
              <div class="bar"><i></i><i></i><i></i><span class="mono">{{ p.link?.replace('https://', '') }}</span></div>
              <img [src]="p.image" [alt]="p.title + ' screenshot'" [style.object-position]="p.imagePosition || 'top'" loading="lazy" />
            </div>
          } @else {
            <div class="ph"><span>{{ p.title.charAt(0) }}</span><small class="mono">{{ p.badge }} project · {{ p.org }}</small></div>
          }
        </div>
        <div class="body">
          <div class="meta">
            <span class="badge" [class.live]="!!p.link">{{ p.badge }}</span>
            <span class="mono when">{{ p.period }}</span>
            <button type="button" class="btn sm" (click)="listen()"><app-icon name="volume" [size]="13" /> Listen</button>
            @if (p.link) { <a class="btn sm" [href]="p.link" target="_blank" rel="noopener"><app-icon name="external" [size]="13" /> Visit</a> }
          </div>
          <h2>{{ p.title }}</h2>
          <p class="org">{{ p.org }}</p>
          <ul>@for (f of p.features; track f) { <li><app-icon name="check" [size]="14" /> {{ f }}</li> }</ul>
          <div class="tech">@for (t of p.tech; track t) { <span class="chip"><app-skill-icon [name]="base(t)" [size]="12" color="currentColor" /> {{ t }}</span> }</div>
        </div>
      </article>
    </div>
  `,
  styles: `
    .split { display: grid; grid-template-columns: 250px minmax(0, 1fr); height: 100%; }
    aside { padding: 14px 10px; border-right: 1px solid var(--line); background: color-mix(in srgb, var(--solid) 30%, transparent); overflow-y: auto; display: grid; align-content: start; gap: 4px; }
    .side { padding: 4px 8px 8px; font-size: 0.64rem; }
    aside button { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 12px; border: 0; background: none; cursor: pointer; text-align: left; }
    aside button:hover { background: var(--glass-2); }
    aside button.on { background: linear-gradient(135deg, color-mix(in srgb, var(--c) 30%, transparent), transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 50%, transparent); }
    .sw { width: 10px; height: 34px; border-radius: 6px; background: var(--c); flex-shrink: 0; }
    .t { display: flex; flex-direction: column; min-width: 0; }
    .t b { font-size: 0.88rem; }
    .t small { color: var(--ink-3); font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    article { overflow-y: auto; animation: fade-up 0.25s; }
    .shot { padding: 22px 22px 0; background: linear-gradient(135deg, color-mix(in srgb, var(--c) 30%, transparent), color-mix(in srgb, var(--c2) 20%, transparent)); }
    .frame { border-radius: 12px 12px 0 0; overflow: hidden; background: #fff; box-shadow: 0 -10px 40px -20px rgba(0,0,0,0.5); }
    .bar { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #fff; border-bottom: 1px solid #e5e7eb; }
    .bar i { width: 9px; height: 9px; border-radius: 50%; background: #ff5f57; } .bar i:nth-child(2) { background: #febc2e; } .bar i:nth-child(3) { background: #28c840; }
    .bar span { margin-left: 8px; font-size: 0.7rem; color: #6b7280; }
    .frame img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; }
    .ph { aspect-ratio: 16 / 6; display: grid; place-items: center; align-content: center; gap: 10px; padding-bottom: 22px; }
    .ph span { width: 84px; height: 84px; border-radius: 24px; display: grid; place-items: center; font: 800 2.4rem var(--display); color: #fff; background: linear-gradient(135deg, var(--c), var(--c2)); }
    .ph small { color: var(--ink-2); font-size: 0.74rem; }
    .body { padding: 22px; }
    .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .badge { padding: 3px 11px; border-radius: 999px; font: 700 0.66rem var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--violet); background: color-mix(in srgb, var(--violet) 15%, transparent); }
    .badge.live { color: var(--teal); background: color-mix(in srgb, var(--teal) 15%, transparent); }
    .when { flex: 1; font-size: 0.78rem; color: var(--ink-3); }
    .sm { padding: 6px 12px; font-size: 0.78rem; border-radius: 10px; }
    h2 { font-size: 2rem; margin-top: 14px; }
    .org { color: var(--c); font-weight: 600; margin-top: 2px; }
    ul { list-style: none; padding: 0; margin: 14px 0; display: grid; gap: 7px; }
    li { display: flex; gap: 8px; color: var(--ink-2); font-size: 0.92rem; }
    li app-icon { color: var(--teal); margin-top: 4px; flex-shrink: 0; }
    .tech { display: flex; flex-wrap: wrap; gap: 6px; }
    @media (max-width: 760px) {
      .split { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      aside { grid-auto-flow: column; grid-auto-columns: 200px; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--line); }
      .side { display: none; }
    }
  `,
})
export class Projects {
  private kai = inject(KaiService);
  protected readonly list = PROJECTS;
  protected readonly pick = signal(PROJECTS[0].title);
  protected readonly cur = computed(() => PROJECTS.find(p => p.title === this.pick())!);

  constructor() {
    // the window's "Explain" button narrates whichever project is selected
    const os = inject(OsService);
    os.narrators.set('projects', () => projectStory(this.pick()));
    inject(DestroyRef).onDestroy(() => os.narrators.delete('projects'));
  }
  protected listen() {
    this.kai.explain('projects', projectStory(this.pick()));
  }
  protected base(t: string) {
    return baseSkillName(t);
  }
}
