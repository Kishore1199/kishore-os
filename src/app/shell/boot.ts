import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Icon } from '../core/icon';
import { Logo } from '../core/logo';
import { KaiService } from '../core/kai.service';
import { OsService, winId } from '../core/os.service';
import { AI_FEATURES } from '../data/ai-features.data';
import { SessionService } from '../core/session.service';

const LINES = [
  'Kishore.OS BIOS 3.0 · Java Full Stack Edition',
  'Checking memory ......... 3+ years OK',
  'Loading kernel: spring-boot-3 (java 21) ...... OK',
  'Mounting /projects ...... 6 found',
  'Mounting /skills ........ 58 found',
  'Indexing /study-notes ... 84 chapters',
  'Starting ALPHA agent ...... ready',
  `Loading AI Lab .......... ${AI_FEATURES.length} options`,
  'Welcome.',
];

/** Boot screen. The start buttons double as the user gesture browsers require before speech can play. */
@Component({
  selector: 'app-boot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Logo],
  template: `
    @if (!gone()) {
      <div class="boot" [class.out]="leaving()">
        <div class="logo"><app-logo [size]="96" /><b>Kishore<span>.OS</span></b></div>
        <div class="log mono" aria-live="polite">@for (l of shown(); track $index) { <div>{{ l }}</div> }</div>
        <div class="bar"><i [style.width.%]="shown().length / lines.length * 100"></i></div>
        @if (ready()) {
          <div class="go">
            <button type="button" class="btn hot big" (click)="start(true)" autofocus><app-icon name="volume" [size]="18" /> Start the voice tour</button>
            <button type="button" class="btn big" (click)="start(false)"><app-icon name="grid" [size]="18" /> Explore on my own</button>
          </div>
          <p class="hint mono">ALPHA will talk you through everything · turn your sound on</p>
        }
      </div>
    }
  `,
  styles: `
    .boot { position: fixed; inset: 0; z-index: 500; display: grid; place-items: center; align-content: center; gap: 22px; padding: 24px; background: #05040c; color: #e9e6ff; transition: opacity 0.6s, filter 0.6s; }
    .boot.out { opacity: 0; filter: blur(12px); pointer-events: none; }
    .logo { display: grid; justify-items: center; gap: 14px; animation: fade-up 0.6s both; }
    .logo app-logo { filter: drop-shadow(0 20px 40px rgba(192,38,211,0.55)); }
    .logo b { font: 700 2rem/1 var(--display); letter-spacing: -0.03em; }
    .logo b span { color: #ff7a3d; }
    .log { width: min(560px, 100%); min-height: 190px; margin: 0; font-size: 0.82rem; line-height: 1.75; color: #a7a3c9; }
    .bar { width: min(560px, 100%); height: 4px; border-radius: 4px; background: rgba(255,255,255,0.08); overflow: hidden; }
    .bar i { display: block; height: 100%; background: linear-gradient(90deg, #8b5cf6, #ff7a3d); transition: width 0.25s; }
    .go { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; animation: fade-up 0.4s both; }
    .big { padding: 15px 24px; font-size: 1rem; border-radius: 16px; }
    .go .btn:not(.hot) { color: #e9e6ff; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); }
    .hint { font-size: 0.74rem; color: #7b7799; text-align: center; }
  `,
})
export class Boot implements OnInit, OnDestroy {
  private os = inject(OsService);
  private kai = inject(KaiService);
  private session = inject(SessionService);
  protected readonly lines = LINES;
  protected readonly shown = signal<string[]>([]);
  protected readonly ready = signal(false);
  protected readonly gone = signal(false);
  protected readonly leaving = signal(false);
  private t?: ReturnType<typeof setInterval>;

  ngOnInit() {
    let seen = false;
    try { seen = sessionStorage.getItem('kv-booted') === '1'; } catch { /* ignore */ }
    if (seen) { this.finish(false, true); return; }
    let i = 0;
    this.t = setInterval(() => {
      this.shown.update(s => [...s, LINES[i++]]);
      if (i >= LINES.length) { clearInterval(this.t); this.ready.set(true); }
    }, 170);
  }

  protected start(tour: boolean) {
    this.leaving.set(true);
    setTimeout(() => this.finish(tour, false), 550);
  }

  private finish(tour: boolean, quiet: boolean) {
    this.gone.set(true);
    this.os.booted.set(true);
    try { sessionStorage.setItem('kv-booted', '1'); } catch { /* ignore */ }
    const hash = location.hash, deep = winId(hash.slice(1));
    const last = quiet ? this.session.last() : []; // a reload in the same tab: carry on where you were
    if (last.length) { this.os.restore(last); this.session.restored = true; }
    if (deep) this.os.open(deep);
    else if (hash.startsWith('#lab/')) history.replaceState(null, '', hash); // LabRouter opens the tool
    else if (last.length) { /* the windows are back */ }
    else if (tour) this.kai.tour();
    else { this.os.open('about'); if (!quiet) this.kai.say("Welcome! I'm Alpha, I'm here to assist you. Tap my orb any time if you want me to explain something."); }
  }

  ngOnDestroy() {
    clearInterval(this.t);
  }
}
