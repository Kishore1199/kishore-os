import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '../core/icon';
import { KaiService } from '../core/kai.service';
import { APPS, OsService } from '../core/os.service';
import { EXPERIENCE, PROFILE } from '../data/portfolio.data';

@Component({
  selector: 'app-desktop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <nav class="icons" aria-label="Desktop apps">
      @for (a of apps; track a.id) {
        <button type="button" class="di" (click)="os.open(a.id)" [attr.aria-label]="'Open ' + a.title">
          <span class="ic" [style.--c]="a.color"><app-icon [name]="a.icon" [size]="24" /></span>
          <span class="lb">{{ a.title }}</span>
        </button>
      }
    </nav>

    <aside class="widgets">
      <div class="w hello">
        <p class="kicker">Portfolio OS</p>
        <h1>Kishore V<span>.</span></h1>
        <p class="role">{{ p.role }}</p>
        <p class="live mono"><i></i> {{ now.role }} @ {{ now.company }}</p>
        <div class="row">
          <button type="button" class="btn hot" (click)="kai.tour()"><app-icon name="volume" [size]="15" /> Hear the tour</button>
          <button type="button" class="btn" (click)="kai.chatOpen.set(true)"><app-icon name="mic" [size]="15" /> Ask ALPHA</button>
          <button type="button" class="btn" (click)="os.open('ailab')"><app-icon name="spark" [size]="15" /> AI Lab</button>
        </div>
      </div>
      <div class="w note">
        <b>Tips</b>
        <ul>
          <li><kbd>Ctrl</kbd> + <kbd>K</kbd> search everything</li>
          <li>Drag windows — and ALPHA 🤖 — anywhere</li>
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
    .icons { position: absolute; left: 18px; top: 18px; bottom: 100px; display: grid; grid-auto-flow: column; grid-template-rows: repeat(auto-fill, 96px); grid-auto-columns: 92px; gap: 4px; }
    .di { display: grid; justify-items: center; align-content: start; gap: 6px; padding: 8px 4px; border: 0; border-radius: 14px; background: none; cursor: pointer; }
    .di:hover, .di:focus-visible { background: color-mix(in srgb, var(--solid) 40%, transparent); }
    .ic { width: 52px; height: 52px; border-radius: 15px; display: grid; place-items: center; color: #fff;
      background: linear-gradient(145deg, color-mix(in srgb, var(--c) 85%, #fff), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 22px -10px var(--c); transition: transform 0.2s; }
    .di:hover .ic { transform: translateY(-3px) scale(1.05); }
    .lb { font-size: 0.74rem; font-weight: 600; text-align: center; line-height: 1.2; text-shadow: 0 1px 6px rgba(0,0,0,0.45); color: #fff; }
    :host-context([data-theme='light']) .lb { color: var(--ink); text-shadow: none; }
    .widgets { position: absolute; right: 24px; top: 22px; width: 330px; display: grid; gap: 14px; }
    .w { padding: 20px; border-radius: 22px; background: var(--glass); backdrop-filter: blur(24px) saturate(1.4); border: 1px solid var(--line-2); box-shadow: var(--shadow); animation: fade-up 0.5s both; }
    .hello h1 { font-size: 2.3rem; margin: 6px 0 2px; }
    .hello h1 span { color: var(--accent); }
    .role { font-weight: 600; color: var(--ink-2); }
    .live { display: flex; align-items: center; gap: 8px; margin: 12px 0 16px; font-size: 0.72rem; color: var(--teal); }
    .live i { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 10px var(--teal); flex-shrink: 0; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; }
    .row .btn { flex: 1; padding: 10px 12px; }
    .note { animation-delay: 0.1s; background: color-mix(in srgb, #fde68a 18%, var(--glass)); }
    .note ul { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 4px; font-size: 0.84rem; color: var(--ink-2); }
    kbd, code { padding: 1px 6px; border-radius: 5px; border: 1px solid var(--line-2); font: 500 0.72rem var(--mono); }
    em { font-style: normal; font-weight: 600; color: var(--teal); }
    @media (max-width: 1100px) { .note { display: none; } }
    /* phones: a home screen — widget on top, app grid below */
    @media (max-width: 760px) {
      :host { overflow-y: auto; padding: 14px 14px 170px; }
      .widgets { position: static; width: auto; margin-bottom: 18px; }
      .icons { position: static; display: grid; grid-auto-flow: row; grid-template-rows: none; grid-template-columns: repeat(4, 1fr); grid-auto-columns: auto; gap: 10px 4px; }
      .hello h1 { font-size: 2.1rem; }
    }
  `,
})
export class Desktop {
  protected readonly os = inject(OsService);
  protected readonly kai = inject(KaiService);
  protected readonly apps = APPS;
  protected readonly p = PROFILE;
  protected readonly now = EXPERIENCE[0];
}
