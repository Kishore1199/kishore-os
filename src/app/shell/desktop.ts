import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { DesktopIcons } from './desktop-icons';
import { Icon } from '../core/icon';
import { KaiService } from '../core/kai.service';
import { OsService } from '../core/os.service';
import { WallpaperService, pictureIn } from '../core/wallpaper.service';
import { prefersReducedMotion } from '../core/theme.service';
import { EXPERIENCE, PROFILE } from '../data/portfolio.data';

@Component({
  selector: 'app-desktop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DesktopIcons, Icon],
  host: { '(dragover)': '$event.preventDefault()', '(drop)': 'dropped($event)' },
  template: `
    <app-desktop-icons />

    <aside class="widgets">
      <div class="w hello">
        <p class="kicker">Portfolio OS</p>
        <h1>Kishore V<span>.</span></h1>
        <p class="role">{{ p.role }}</p>
        <p class="live mono"><i></i> {{ now.role }} @ {{ now.company }}</p>
        <div class="slider" role="group" aria-roledescription="carousel" aria-label="What to do first" (pointerenter)="hover.set($event.pointerType === 'mouse')" (pointerleave)="hover.set(false)" (focusin)="focus($event)" (focusout)="focused.set(false)">
          <div class="slides">
            @for (c of cards; track c.label; let i = $index) {
              <button type="button" class="btn" [class.hot]="!i" [class.now]="slide() === i" [class.was]="was() === i" [inert]="slide() !== i" (click)="c.run()"><app-icon [name]="c.icon" [size]="16" /> {{ c.label }}</button>
            }
          </div>
          <div class="nav">
            @for (c of cards; track c.label; let i = $index) {
              <button type="button" class="dot" [attr.aria-current]="slide() === i" [attr.aria-label]="'Show ' + c.label" (click)="go(i)"><i></i></button>
            }
            <button type="button" class="pp" (click)="paused.set(!paused())" [attr.aria-label]="paused() ? 'Play the slider' : 'Pause the slider'"><app-icon [name]="paused() ? 'play' : 'pause'" [size]="11" /></button>
          </div>
        </div>
      </div>
      <div class="w note">
        <b>Tips</b>
        <ul>
          <li><kbd>Ctrl</kbd> + <kbd>K</kbd> search everything</li>
          <li>Drop a picture here to change the background</li>
          <li>Drag windows, <b>icons</b> and ALPHA 🤖 anywhere</li>
          <li>🔊 <em>Explain</em> on any window — ALPHA reads it aloud</li>
          <li>Turn on 🎤 and say <b>“Alpha”</b></li>
          <li>Say <b>“put projects next to skills”</b></li>
          <li>Ask the Terminal a question, in plain English</li>
        </ul>
      </div>
    </aside>
  `,
  styles: `
    :host { position: fixed; inset: 40px 0 0; z-index: 1; }
    .widgets { position: absolute; right: 24px; top: 22px; width: 330px; display: grid; gap: 14px; }
    .w { padding: 20px; border-radius: 22px; background: var(--glass); backdrop-filter: blur(24px) saturate(1.4); border: 1px solid var(--line-2); box-shadow: var(--shadow); animation: fade-up 0.5s both; }
    .hello h1 { font-size: 2.3rem; margin: 6px 0 2px; }
    .hello h1 span { color: var(--accent); }
    .role { font-weight: 600; color: var(--ink-2); }
    .live { display: flex; align-items: center; gap: 8px; margin: 12px 0 16px; font-size: 0.72rem; color: var(--teal); }
    .live i { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 10px var(--teal); flex-shrink: 0; }
    .slides { position: relative; height: 48px; overflow: hidden; border-radius: 12px; }
    .slides .btn { position: absolute; inset: 0; transform: translateX(105%); visibility: hidden; }
    .slides .now, .slides .was { visibility: visible; transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s; }
    .slides .now { transform: none; } .slides .was { transform: translateX(-105%); }
    .nav { display: flex; align-items: center; justify-content: center; margin: 4px 0 -10px; }
    .dot, .pp { display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 8px; background: none; color: var(--ink-2); cursor: pointer; }
    .dot i { width: 7px; height: 7px; border-radius: 4px; background: var(--ink-3); transition: width 0.3s, background 0.3s; } .dot[aria-current='true'] i { width: 18px; background: var(--accent); }
    .pp:hover { color: var(--accent); }
    @media (prefers-reduced-motion: reduce) { .slides .now, .slides .was { transition: none; } .slides .was { visibility: hidden; } }
    .note { animation-delay: 0.1s; background: color-mix(in srgb, #fde68a 18%, var(--glass)); }
    .note ul { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 4px; font-size: 0.84rem; color: var(--ink-2); }
    kbd, code { padding: 1px 6px; border-radius: 5px; border: 1px solid var(--line-2); font: 500 0.72rem var(--mono); }
    em { font-style: normal; font-weight: 600; color: var(--teal); }
    @media (max-width: 1100px) { .note { display: none; } }
    /* phones: a home screen — widget on top, app grid below */
    @media (max-width: 760px) {
      :host { overflow-y: auto; padding: 14px 14px 170px; }
      .widgets { position: static; width: auto; margin-bottom: 18px; }
      .hello h1 { font-size: 2.1rem; }
    }
  `,
})
export class Desktop {
  protected readonly os = inject(OsService);
  protected readonly kai = inject(KaiService);
  protected readonly p = PROFILE;
  protected readonly now = EXPERIENCE[0];

  private paper = inject(WallpaperService);

  /** a picture dropped on the desktop becomes the background */
  protected async dropped(e: DragEvent) {
    e.preventDefault(); // or the browser would open the file
    const f = pictureIn(e.dataTransfer);
    if (!f) return;
    if (!(await this.paper.usePhoto(f)) && this.paper.error()) this.os.notify(this.paper.error());
  }

  // ── the buttons on the card, one at a time ──
  protected readonly cards = [
    { label: 'Hear the tour', icon: 'volume', run: () => void this.kai.tour() },
    { label: 'Ask ALPHA', icon: 'mic', run: () => this.kai.chatOpen.set(true) },
    { label: 'AI Lab', icon: 'spark', run: () => this.os.open('ailab') },
  ];
  protected readonly slide = signal(0);
  /** the one sliding out */
  protected readonly was = signal(-1);
  protected readonly paused = signal(prefersReducedMotion());
  protected readonly hover = signal(false);
  protected readonly focused = signal(false);

  constructor() {
    // every three seconds, but never while somebody is about to press a button
    effect(clean => {
      this.slide(); // a manual change starts the three seconds again
      if (this.paused() || this.hover() || this.focused()) return;
      const t = setInterval(() => { if (!document.hidden) this.go((this.slide() + 1) % this.cards.length); }, 3000);
      clean(() => clearInterval(t));
    });
  }
  protected go(i: number) {
    untracked(() => { if (i !== this.slide()) { this.was.set(this.slide()); this.slide.set(i); } });
  }
  /** keyboard focus holds the slider still; a mouse click should not */
  protected focus(e: FocusEvent) {
    this.focused.set((e.target as HTMLElement).matches(':focus-visible'));
  }
}
