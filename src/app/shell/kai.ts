import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Icon } from '../core/icon';
import { KaiService } from '../core/kai.service';
import { OsService } from '../core/os.service';
import { ThemeService } from '../core/theme.service';
import { Mood, Robot, Zone } from './robot';

const SUGGEST = ['Start the tour', 'Who is Kishore?', 'Tell me about the 75Health EMR', 'Does he know Docker?', 'Show his experience', 'JWT notes', 'How do I contact him?', 'How was this site built?'];

/**
 * ALPHA, drawn as a mini robot. Idle, it sits in the corner as the chat button; when it talks it flies
 * into the screen, waves, and its mouth bars move with the voice (no subtitles — the chat keeps the text).
 */
@Component({
  selector: 'app-kai',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Robot],
  template: `
    <!-- chat panel -->
    @if (kai.chatOpen()) {
      <section class="panel" role="dialog" aria-label="Chat with ALPHA">
        <header>
          <div><b>ALPHA</b><small class="mono">here to assist you · {{ kai.cloud.enabled ? 'Gemini AI' : 'offline brain' }} · {{ kai.voice.voiceName() || 'voice off' }}</small></div>
          <button type="button" class="wake" [class.on]="kai.voice.wakeOn()" (click)="kai.toggleWake()" [attr.aria-pressed]="kai.voice.wakeOn()" title="Wake ALPHA by saying &quot;Alpha&quot;"><app-icon name="mic" [size]="12" /> Alpha</button>
          <button type="button" class="tbtn" (click)="kai.tour()"><app-icon name="play" [size]="12" /> Tour</button>
          <button type="button" class="x" (click)="kai.chatOpen.set(false)" aria-label="Close chat"><app-icon name="close" [size]="15" /></button>
        </header>
        <div class="log" #log>
          @for (m of kai.msgs(); track $index) { <p class="m" [class.me]="m.from === 'me'">{{ m.text }}</p> }
          @if (kai.voice.listening()) { <p class="m me live">{{ kai.voice.interim() || 'Listening…' }}</p> }
          @if (kai.thinking()) { <p class="m dots" aria-label="ALPHA is thinking"><i></i><i></i><i></i></p> }
        </div>
        <div class="sugg">@for (s of suggest; track s) { <button type="button" (click)="kai.ask(s)">{{ s }}</button> }</div>
        <form (submit)="$event.preventDefault(); kai.ask(inp.value); inp.value = ''">
          <button type="button" class="mic" [class.on]="kai.voice.listening()" (click)="kai.listenAndAsk()" [attr.aria-label]="kai.voice.listening() ? 'Stop listening' : 'Ask with your voice'" [disabled]="!kai.voice.canListen" [title]="kai.voice.canListen ? 'Ask out loud' : 'Voice input needs Chrome, Edge or Safari'">
            <app-icon name="mic" [size]="17" />
          </button>
          <input #inp class="field" placeholder="Ask about projects, skills, notes…" aria-label="Ask ALPHA" autocomplete="off" />
          <button type="submit" class="send" aria-label="Send"><app-icon name="send" [size]="16" /></button>
        </form>
      </section>
    }

    <!-- the robot -->
    <div class="dock-bot" [class.moved]="!!pos()" [class.dragging]="dragging()" [style.left.px]="pos()?.x" [style.top.px]="pos()?.y" [class.live]="live()" [class.talk]="kai.voice.speaking()" [class.listen]="kai.voice.listening()" [class.happy]="mood() === 'happy' || mood() === 'wink' || mood() === 'love'" #bot>
      @if (live()) {
        <div class="ctl" role="toolbar" aria-label="ALPHA controls">
          @if (kai.tourStep() >= 0) {
            <span class="mono step">{{ kai.tourStep() + 1 }}/{{ kai.tourTotal }}</span>
            <button type="button" (click)="kai.pauseTour()" [attr.aria-label]="kai.tourPaused() ? 'Resume tour' : 'Pause tour'"><app-icon [name]="kai.tourPaused() ? 'play' : 'pause'" [size]="13" /></button>
            <button type="button" (click)="kai.skipTour()" aria-label="Next stop"><app-icon name="skip" [size]="13" /></button>
          }
          <button type="button" (click)="kai.stopTour()" aria-label="Stop ALPHA"><app-icon name="stop" [size]="13" /></button>
        </div>
        @if (kai.voice.speaking() && !kai.voice.enabled()) {
          <div class="bubble">Sound is off <button type="button" (click)="unmute()"><app-icon name="volume" [size]="12" /> Unmute</button></div>
        }
      }
      <div class="bot" (dblclick)="flash('love', 2000)" (pointerdown)="dragStart($event)" title="Drag me anywhere">
        @if (kai.voice.wakeLive()) { <span class="ear" [class.heard]="kai.voice.wakeHeard()" title="Listening for &quot;Alpha&quot;">👂</span> }
        <app-robot [mood]="mood()" (touched)="touch($event)" (pointerenter)="hover.set(true)" (pointerleave)="hover.set(false)" />
        <button type="button" class="name mono" (click)="toggleChat()" aria-label="Talk to ALPHA, your assistant">{{ label() }}</button>
      </div>
    </div>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 180; pointer-events: none; }
    :host > * { pointer-events: auto; }

    /* ── robot ── */
    .dock-bot { position: fixed; right: 12px; bottom: 6px; width: 132px; display: grid; justify-items: center; transform-origin: bottom right;
      transition: transform 0.7s cubic-bezier(0.34, 1.4, 0.5, 1); --lv: 0; }
    /* talking: fly into the screen and grow */
    .dock-bot.live { transform: translate(-110px, -120px) scale(1.5); }
    .dock-bot.moved { right: auto; bottom: auto; transform-origin: center bottom; }
    .dock-bot.moved.live { transform: scale(1.35); }
    .dock-bot.dragging { transition: none; transform: scale(1.08) rotate(-4deg); cursor: grabbing; }
    .dock-bot.dragging app-robot { filter: drop-shadow(0 26px 22px rgba(0, 0, 0, 0.45)); }
    .bot { width: 132px; display: grid; justify-items: center; touch-action: none; cursor: grab; }
    .name { cursor: pointer; color: var(--ink); margin-top: -2px; padding: 3px 11px; border-radius: 999px; font-size: 0.64rem; letter-spacing: 0.12em; text-transform: uppercase; background: var(--solid); border: 1px solid var(--line-2); white-space: nowrap; }
    .talk .name { color: #ff8a4c; border-color: #ff8a4c; }
    .happy .name { color: #f472b6; border-color: #f472b6; }
    .listen .name { color: #38bdf8; border-color: #38bdf8; }

    .ctl { position: absolute; bottom: calc(100% + 2px); display: flex; align-items: center; gap: 3px; padding: 3px; border-radius: 999px;
      background: color-mix(in srgb, var(--solid) 90%, transparent); border: 1px solid var(--line-2); box-shadow: var(--shadow); transform: scale(0.65); transform-origin: bottom center; animation: fade-up 0.3s; white-space: nowrap; }
    .ctl button { width: 26px; height: 26px; border-radius: 50%; border: 0; background: var(--glass-2); cursor: pointer; display: grid; place-items: center; color: var(--ink); }
    .ctl button:hover { background: var(--accent); color: #fff; }
    .step { padding: 0 6px; font-size: 0.7rem; color: var(--accent); }
    .bubble { position: absolute; right: calc(100% - 6px); top: 6px; display: flex; align-items: center; gap: 6px; padding: 5px 6px 5px 10px; border-radius: 12px 12px 2px 12px; white-space: nowrap;
      background: var(--solid); border: 1px solid var(--line-2); font-size: 0.62rem; font-weight: 600; transform: scale(0.65); transform-origin: right top; box-shadow: var(--shadow); }
    .bubble button { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; border: 0; background: var(--accent); color: #fff; cursor: pointer; font-size: 0.6rem; }

    /* ── chat panel ── */
    .panel { position: fixed; right: 18px; bottom: 185px; width: min(380px, calc(100vw - 24px)); height: min(540px, calc(100dvh - 245px)); display: flex; flex-direction: column; border-radius: 22px; overflow: hidden;
      background: color-mix(in srgb, var(--solid) 88%, transparent); backdrop-filter: blur(24px); border: 1px solid var(--line-2); box-shadow: var(--shadow); animation: fade-up 0.25s; }
    header { display: flex; align-items: center; gap: 8px; padding: 14px 14px 12px 18px; border-bottom: 1px solid var(--line); }
    header div { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    header b { font-family: var(--display); font-size: 1.1rem; }
    header small { font-size: 0.64rem; color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tbtn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 999px; border: 0; cursor: pointer; color: #fff; background: linear-gradient(135deg, var(--violet), var(--accent)); font-size: 0.76rem; font-weight: 600; }
    .wake { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 999px; border: 1px solid var(--line-2); background: none; cursor: pointer; font-size: 0.72rem; font-weight: 600; color: var(--ink-2); }
    .wake.on { color: #fff; border-color: var(--teal); background: var(--teal); box-shadow: 0 0 12px color-mix(in srgb, var(--teal) 60%, transparent); }
    .ear { position: absolute; top: 4px; left: 6px; z-index: 2; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; font-size: 14px;
      background: var(--solid); border: 1px solid var(--teal); box-shadow: 0 0 10px color-mix(in srgb, var(--teal) 70%, transparent); animation: earpulse 2s ease-in-out infinite; }
    .ear.heard { border-color: #fde047; box-shadow: 0 0 16px #fde047; transform: scale(1.2); }
    @keyframes earpulse { 50% { box-shadow: 0 0 2px color-mix(in srgb, var(--teal) 40%, transparent); } }
    .bot { position: relative; }
    .x { width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--line-2); background: none; cursor: pointer; display: grid; place-items: center; }
    .log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    .m { max-width: 88%; padding: 9px 13px; border-radius: 16px 16px 16px 5px; background: var(--glass-2); border: 1px solid var(--line); font-size: 0.88rem; }
    .m.me { align-self: flex-end; border-radius: 16px 16px 5px 16px; color: #fff; border: 0; background: linear-gradient(135deg, var(--violet), color-mix(in srgb, var(--violet) 60%, var(--accent))); }
    .m.live { opacity: 0.7; font-style: italic; }
    .dots { display: flex; gap: 4px; width: fit-content; }
    .dots i { width: 7px; height: 7px; border-radius: 50%; background: var(--ink-3); animation: bounce 1s infinite; }
    .dots i:nth-child(2) { animation-delay: 0.15s; } .dots i:nth-child(3) { animation-delay: 0.3s; }
    @keyframes bounce { 50% { transform: translateY(-5px); } }
    .sugg { display: flex; gap: 6px; overflow-x: auto; padding: 8px 12px; scrollbar-width: none; border-top: 1px solid var(--line); }
    .sugg button { flex-shrink: 0; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--line-2); background: none; cursor: pointer; font-size: 0.74rem; color: var(--ink-2); }
    .sugg button:hover { color: var(--accent); border-color: var(--accent); }
    form { display: flex; gap: 8px; padding: 10px 12px 12px; }
    form .field { padding: 10px 12px; font-size: 0.88rem; }
    .mic, .send { flex-shrink: 0; width: 42px; border-radius: 12px; border: 1px solid var(--line-2); background: var(--glass-2); cursor: pointer; display: grid; place-items: center; }
    .mic.on { color: #fff; background: var(--teal); border-color: var(--teal); animation: pulse 1.2s infinite; }
    .mic:disabled { opacity: 0.4; cursor: not-allowed; }
    .send { border: 0; color: #fff; background: var(--accent); }
    @keyframes pulse { 50% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--teal) 25%, transparent); } }

    @media (max-width: 760px) {
      .dock-bot { bottom: 76px; right: 4px; transform: scale(0.72); }
      .dock-bot.live { transform: translate(-50px, -70px) scale(1.05); }
      .dock-bot.moved { transform: scale(0.72); }
      .dock-bot.moved.live { transform: scale(0.95); }
      .panel { right: 12px; bottom: 190px; height: calc(100dvh - 250px); }
    }
    @media (prefers-reduced-motion: reduce) { .dock-bot.live { transform: scale(1.2); } }
  `,
})
export class Kai {
  protected readonly kai = inject(KaiService);
  protected readonly suggest = SUGGEST;
  /** each mouth bar reacts with a different strength so it looks like speech, not a meter */
  protected readonly bars = [1.6, 2.6, 3.2, 2.4, 1.4];
  private log = viewChild<ElementRef<HTMLElement>>('log');
  private bot = viewChild.required<ElementRef<HTMLElement>>('bot');

  protected readonly hover = signal(false);
  /** dozes off after a quiet spell; any activity wakes it with a wink */
  private readonly sleeping = signal(false);
  private sleepT?: ReturnType<typeof setTimeout>;
  private yawnT?: ReturnType<typeof setTimeout>;
  private taps: number[] = [];
  private os = inject(OsService);
  private theme = inject(ThemeService);
  /** short-lived reaction (a grin after speaking, a wink now and then, a cheer when poked) */
  private readonly react = signal<Mood | null>(null);
  private reactT?: ReturnType<typeof setTimeout>;

  protected readonly mood = computed<Mood>(() => {
    if (this.kai.voice.listening()) return 'listen';
    if (this.dragging()) return 'happy';
    if (this.kai.thinking()) return 'listen';
    if (this.kai.voice.speaking()) return 'talk';
    return this.react() ?? (this.hover() ? 'happy' : this.sleeping() ? 'sleep' : 'idle');
  });
  protected readonly label = computed(() => this.dragging() ? 'wheee!' : this.kai.voice.wakeHeard() ? 'yes?' : this.kai.thinking() ? 'thinking…' : ({ listen: 'listening…', talk: 'speaking', happy: 'hi there!', wink: ':)', love: '♥ aww, thanks!', sleep: 'zzz…', idle: 'ask alpha', blink: 'blink blink!', giggle: 'hehe, that tickles!', dizzy: 'whoa… dizzy', highfive: 'high five! ✋', shy: 'aww, stop…', wow: 'wow! ✨', cool: 'cool 😎', angry: 'hey! stop poking!', sad: 'aww… sorry', party: 'yay! 🎉', yawn: 'yaawn…' })[this.mood()]);

  /** robot is "on stage" while it talks, listens, or a tour is running */
  protected readonly live = computed(() => this.kai.voice.speaking() || this.kai.voice.listening() || (this.kai.tourStep() >= 0 && !this.kai.tourPaused()));

  /** custom position (top-left, px) after the visitor drags ALPHA; null = default corner */
  protected readonly pos = signal<{ x: number; y: number } | null>(this.loadPos());
  protected readonly dragging = signal(false);
  private justDragged = false;

  constructor() {
    addEventListener('resize', () => { const p = this.pos(); if (p) this.pos.set(this.clamp(p.x, p.y)); });
    effect(() => {
      this.kai.msgs(); this.kai.voice.interim();
      const el = this.log()?.nativeElement;
      if (el) queueMicrotask(() => (el.scrollTop = el.scrollHeight));
    });
    // feed the voice level straight into a CSS variable (no template re-render per frame)
    effect(() => this.bot().nativeElement.style.setProperty('--lv', this.kai.voice.level().toFixed(3)));
    // reactions requested from anywhere in the OS (copy → party, projects → wow, …)
    effect(() => {
      const e = this.os.emote();
      if (e && !this.kai.voice.speaking()) untracked(() => { this.sleeping.set(false); this.flash(e.mood as Mood, e.ms); });
    });
    // theme switch → sunglasses
    let firstTheme = true;
    effect(() => {
      this.theme.isDark();
      if (firstTheme) { firstTheme = false; return; }
      untracked(() => this.flash('cool', 1900));
    });
    // eyes follow the pointer (rAF-throttled, writes two CSS variables)
    let eyeRaf = 0;
    addEventListener('pointermove', (ev: PointerEvent) => {
      if (eyeRaf || this.mood() !== 'idle' && this.mood() !== 'happy') return;
      eyeRaf = requestAnimationFrame(() => {
        eyeRaf = 0;
        const el = this.bot().nativeElement, r = el.getBoundingClientRect();
        const dx = (ev.clientX - (r.left + r.width / 2)) / (innerWidth / 2), dy = (ev.clientY - (r.top + r.height * 0.3)) / (innerHeight / 2);
        el.style.setProperty('--ex', Math.max(-1, Math.min(1, dx * 1.6)).toFixed(2));
        el.style.setProperty('--ey', Math.max(-1, Math.min(1, dy * 1.6)).toFixed(2));
      });
    }, { passive: true });
    // grin + wink right after it finishes talking
    let was = false;
    effect(() => {
      const now = this.kai.voice.speaking();
      if (was && !now) untracked(() => this.flash('wink', 1800));
      was = now;
    });
    // fall asleep after 40 s without any activity
    const wake = () => {
      if (this.sleeping()) { this.sleeping.set(false); this.flash('wink', 1400); }
      clearTimeout(this.sleepT);
      clearTimeout(this.yawnT);
      this.yawnT = setTimeout(() => { if (this.mood() === 'idle' && !this.kai.chatOpen()) this.flash('yawn', 2600); }, 36000);
      this.sleepT = setTimeout(() => { if (!this.kai.voice.speaking() && !this.kai.chatOpen()) this.sleeping.set(true); }, 40000);
    };
    ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(ev => addEventListener(ev, wake, { passive: true }));
    wake();
    // love reaction when the visitor says something nice
    effect(() => {
      const last = this.kai.msgs().filter(m => m.from === 'me').pop();
      if (last && /thank|love|awesome|great|nice|cool|amazing|good job|super/i.test(last.text)) untracked(() => this.flash('love', 2600));
    });
    // an idle wink every so often
    setInterval(() => { if (this.mood() === 'idle' && !document.hidden) this.flash('wink', 900); }, 14000);
  }

  /** touching different parts of the robot triggers different reactions */
  /** Press and move more than a few pixels to carry ALPHA; a plain tap still triggers a reaction. */
  protected dragStart(e: PointerEvent) {
    if (e.button !== 0) return;
    const el = this.bot().nativeElement, r = el.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY, ox = sx - r.left, oy = sy - r.top;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      if (!moved) { moved = true; this.dragging.set(true); this.sleeping.set(false); }
      ev.preventDefault();
      this.pos.set(this.clamp(ev.clientX - ox, ev.clientY - oy));
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      if (!moved) return;
      this.dragging.set(false);
      this.justDragged = true; // swallow the click that follows the drop
      setTimeout(() => (this.justDragged = false), 50);
      const p = this.pos()!;
      // dropped near the bottom-right corner → snap home
      if (p.x + el.offsetWidth > innerWidth - 90 && p.y + el.offsetHeight > innerHeight - 90) this.pos.set(null);
      else this.flash('wink', 900);
      try { localStorage.setItem('kv-bot-pos', JSON.stringify(this.pos())); } catch { /* ignore */ }
    };
    addEventListener('pointermove', move, { passive: false });
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  }

  private clamp(x: number, y: number) {
    const el = this.bot()?.nativeElement;
    const w = el?.offsetWidth ?? 132, h = el?.offsetHeight ?? 180;
    return { x: Math.max(0, Math.min(innerWidth - w, x)), y: Math.max(44, Math.min(innerHeight - h, y)) };
  }

  private loadPos(): { x: number; y: number } | null {
    try { const v = JSON.parse(localStorage.getItem('kv-bot-pos') ?? 'null'); return v && typeof v.x === 'number' ? v : null; } catch { return null; }
  }

  protected toggleChat() {
    if (!this.justDragged) this.kai.chatOpen.set(!this.kai.chatOpen());
  }

  protected touch(z: Zone) {
    if (this.justDragged) return;
    if (this.kai.voice.speaking()) return;
    this.sleeping.set(false);
    const map: Record<Zone, [Mood, number]> = { face: ['blink', 800], belly: ['giggle', 1800], head: ['dizzy', 2200], hand: ['highfive', 1500], ear: ['shy', 1800] };
    // poke it 5 times within 2.5 s and it gets grumpy
    const now = Date.now();
    this.taps = [...this.taps.filter(t => now - t < 2500), now];
    if (this.taps.length >= 5) { this.taps = []; this.flash('angry', 2200); return; }
    const [m, ms] = map[z];
    this.flash(m, ms);
  }

  protected flash(m: Mood, ms: number) {
    this.react.set(m);
    clearTimeout(this.reactT);
    this.reactT = setTimeout(() => this.react.set(null), ms);
  }



  protected unmute() {
    this.kai.voice.toggle();
    const step = this.kai.tourStep();
    if (step >= 0) this.kai.tour(step); // replay the current tour stop so it is actually heard
    else this.kai.voice.stop();
  }

}
