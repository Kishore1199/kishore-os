import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { Icon } from '../core/icon';
import { KaiService } from '../core/kai.service';
import { APPS, OsService } from '../core/os.service';
import { ThemeService } from '../core/theme.service';
import { PROFILE, PROJECTS, SKILL_CATEGORIES } from '../data/portfolio.data';
import { STUDY_GUIDES } from '../data/study.data';

interface Item { kind: string; label: string; sub: string; icon: string; run: () => void; }

/** Ctrl/⌘ + K search across apps, actions, projects, skills and all study chapters. */
@Component({
  selector: 'app-spotlight',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="scrim" (click)="os.spotlight.set(false)">
      <div class="box" role="dialog" aria-label="Spotlight search" (click)="$event.stopPropagation()">
        <label class="in">
          <app-icon name="search" [size]="20" />
          <input #inp [value]="q()" (input)="q.set($any($event.target).value); sel.set(0)" (keydown)="key($event)" placeholder="Search apps, projects, skills, 84 study chapters…" aria-label="Search" />
          <kbd class="mono">esc</kbd>
        </label>
        <ul role="listbox">
          @for (it of results(); track it.kind + it.label; let i = $index) {
            <li role="option" [attr.aria-selected]="i === sel()" [class.on]="i === sel()" (mouseenter)="sel.set(i)" (click)="pick(it)">
              <span class="ic"><app-icon [name]="it.icon" [size]="15" /></span>
              <span class="t"><b>{{ it.label }}</b><small>{{ it.sub }}</small></span>
              <span class="k mono">{{ it.kind }}</span>
            </li>
          } @empty { <li class="none mono">Nothing found — try "spring", "docker" or "dp"</li> }
        </ul>
        <p class="foot mono">↑↓ to move · enter to open · tip: you can also ask ALPHA out loud</p>
      </div>
    </div>
  `,
  styles: `
    .scrim { position: fixed; inset: 0; z-index: 400; display: grid; justify-items: center; padding: 14vh 16px 16px; align-content: start; background: rgba(5, 4, 12, 0.45); backdrop-filter: blur(4px); animation: fade-up 0.15s; }
    .box { width: min(640px, 100%); border-radius: 20px; overflow: hidden; background: color-mix(in srgb, var(--solid) 92%, transparent); backdrop-filter: blur(30px); border: 1px solid var(--line-2); box-shadow: var(--shadow); }
    .in { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--line); color: var(--ink-3); }
    .in input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font-size: 1.1rem; color: var(--ink); }
    kbd { padding: 2px 7px; border-radius: 6px; border: 1px solid var(--line-2); font-size: 0.7rem; }
    ul { list-style: none; margin: 0; padding: 6px; max-height: 50vh; overflow-y: auto; }
    li { display: flex; align-items: center; gap: 12px; padding: 9px 10px; border-radius: 12px; cursor: pointer; }
    li.on { background: linear-gradient(135deg, color-mix(in srgb, var(--violet) 80%, transparent), color-mix(in srgb, var(--accent) 70%, transparent)); color: #fff; }
    li.on small, li.on .k { color: rgba(255,255,255,0.8); }
    .ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; background: var(--glass-2); flex-shrink: 0; }
    .t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .t b { font-size: 0.92rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .t small { color: var(--ink-3); font-size: 0.76rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .k { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-3); }
    .none { padding: 16px; color: var(--ink-3); font-size: 0.82rem; }
    .foot { padding: 10px 18px; border-top: 1px solid var(--line); font-size: 0.68rem; color: var(--ink-3); }
  `,
})
export class Spotlight {
  protected readonly os = inject(OsService);
  private kai = inject(KaiService);
  private theme = inject(ThemeService);
  private inp = viewChild.required<ElementRef<HTMLInputElement>>('inp');
  protected readonly q = signal('');
  protected readonly sel = signal(0);

  private readonly all: Item[] = [
    ...APPS.map(a => ({ kind: 'app', label: a.title, sub: 'Open app', icon: a.icon, run: () => this.os.open(a.id) })),
    { kind: 'action', label: 'Start the voice tour', sub: 'ALPHA walks you through everything', icon: 'volume', run: () => this.kai.tour() },
    { kind: 'action', label: 'Toggle light / dark', sub: 'Theme', icon: 'sun', run: () => this.theme.toggle() },
    { kind: 'action', label: 'Copy email address', sub: PROFILE.email, icon: 'copy', run: () => this.os.copy(PROFILE.email, 'Email') },
    { kind: 'action', label: 'Turn "Hey Alpha" wake word on/off', sub: 'Wake ALPHA with your voice', icon: 'mic', run: () => this.kai.toggleWake() },
    { kind: 'action', label: 'Ask ALPHA', sub: 'Open the voice assistant', icon: 'mic', run: () => this.kai.chatOpen.set(true) },
    ...PROJECTS.map(p => ({ kind: 'project', label: p.title, sub: `${p.org} · ${p.period}`, icon: 'folder', run: () => this.os.open('projects') })),
    ...SKILL_CATEGORIES.flatMap(c => c.skills.map(s => ({ kind: 'skill', label: s.name, sub: c.name, icon: 'layers', run: () => this.os.open('skills') }))),
    ...STUDY_GUIDES.flatMap(g => g.topics.map(t => ({ kind: 'chapter', label: t.title, sub: `${g.short} · ${t.questions} questions`, icon: 'book-open', run: () => window.open(`${g.file}#${t.id}`, '_blank', 'noopener') }))),
  ];

  protected readonly results = computed(() => {
    const q = this.q().trim().toLowerCase();
    if (!q) return this.all.filter(i => i.kind === 'app' || i.kind === 'action').slice(0, 14);
    const score = (i: Item) => { const l = i.label.toLowerCase(); return l.startsWith(q) ? 0 : l.includes(q) ? 1 : i.sub.toLowerCase().includes(q) ? 2 : 9; };
    return this.all.map(i => ({ i, s: score(i) })).filter(x => x.s < 9).sort((a, b) => a.s - b.s).slice(0, 40).map(x => x.i);
  });

  constructor() {
    afterNextRender(() => this.inp().nativeElement.focus());
  }

  protected key(e: KeyboardEvent) {
    const n = this.results().length;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.sel.set((this.sel() + 1) % Math.max(n, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.sel.set((this.sel() - 1 + n) % Math.max(n, 1)); }
    else if (e.key === 'Enter') { const it = this.results()[this.sel()]; if (it) this.pick(it); }
    else if (e.key === 'Escape') this.os.spotlight.set(false);
  }
  protected pick(it: Item) {
    this.os.spotlight.set(false);
    it.run();
  }
}
