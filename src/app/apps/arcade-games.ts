import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, signal, viewChild } from '@angular/core';
import { Icon } from '../core/icon';
import { Cell, DROP, Drop, LEVELS, Level, alphaMove, best, caught, newDrop, save, winner } from '../core/arcade';
import { Mood, Robot } from '../layout/robot';

const SHARED = `
    :host { display: grid; gap: 14px; }
    .hud { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-size: 0.82rem; color: var(--ink-2); } .hud b { color: var(--ink); font-size: 1rem; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; } .row .btn { padding: 9px 16px; font-size: 0.86rem; } .row .btn[aria-pressed='true'] { color: #fff; border-color: #c2410c; background: #c2410c; }
    .say { padding: 10px 14px; border-radius: 4px 16px 16px 16px; background: var(--glass-2); border: 1px solid var(--line); font-size: 0.92rem; }
    small { color: var(--ink-2); font-size: 0.78rem; }`;

/** Noughts and crosses against ALPHA. */
@Component({
  selector: 'app-tictactoe', changeDetection: ChangeDetectionStrategy.OnPush, imports: [Robot],
  template: `
    <div class="row" role="group" aria-label="Level">@for (l of levels; track l) { <button type="button" class="btn" [attr.aria-pressed]="level() === l" (click)="pick(l)">{{ l }}</button> }</div>
    <div class="two">
      <div class="board" role="group" aria-label="Board">
        @for (c of board(); track $index; let i = $index) {
          <button type="button" [class.x]="c === 'X'" [class.o]="c === 'O'" [class.win]="line().includes(i)" [disabled]="!!c || over() || thinking()" (click)="play(i)" [attr.aria-label]="name(i, c)">{{ c }}</button>
        }
      </div>
      <div class="side"><app-robot [mood]="mood()" /><p class="say" aria-live="polite">{{ text() }}</p></div>
    </div>
    <div class="row"><button type="button" class="btn hot" (click)="again()">New game</button><small>You {{ you() }} · ALPHA {{ me() }} · draws {{ draws() }}. You are X.</small></div>`,
  styles: [SHARED, `
    .two { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 24px; align-items: center; } .side { display: grid; justify-items: center; gap: 8px; }
    .board { display: grid; grid-template-columns: repeat(3, 84px); grid-auto-rows: 84px; gap: 8px; }
    .board button { border-radius: 16px; border: 1px solid var(--line-2); background: var(--glass-2); font: 800 2.4rem/1 var(--display); cursor: pointer; color: var(--ink); } .board button:not(:disabled):hover { border-color: var(--accent); } .board button:disabled { cursor: default; }
    .board .x { color: var(--accent); } .board .o { color: var(--teal); } .board .win { border-color: currentColor; box-shadow: inset 0 0 0 2px currentColor; }
    @media (max-width: 560px) { .two { grid-template-columns: 1fr; justify-items: center; } }`],
})
export class TicTacToe implements OnDestroy {
  protected readonly levels = LEVELS;
  protected readonly level = signal<Level>('Easy');
  protected readonly board = signal<Cell[]>(Array(9).fill(null));
  protected readonly thinking = signal(false);
  protected readonly result = computed(() => winner(this.board()));
  protected readonly over = computed(() => this.result() !== null);
  protected readonly line = computed(() => { const r = this.result(); return r && r !== 'draw' ? r.line : []; });
  protected readonly you = signal(0);
  protected readonly me = signal(0);
  protected readonly draws = signal(0);
  protected readonly mood = signal<Mood>('happy');
  protected readonly text = signal('You start. Get three in a row.');
  private t?: ReturnType<typeof setTimeout>;

  protected name(i: number, c: Cell) {
    return `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}, ${c ?? 'empty'}`;
  }
  protected play(i: number) {
    if (this.over() || this.thinking() || this.board()[i]) return;
    this.mark(i, 'X');
    if (this.done()) return;
    this.thinking.set(true);
    this.mood.set('listen');
    this.text.set('Hmm…');
    this.t = setTimeout(() => {
      this.thinking.set(false);
      this.mark(alphaMove(this.board(), this.level()), 'O');
      if (!this.done()) { this.mood.set('happy'); this.text.set('Your turn.'); }
    }, 500);
  }
  private mark(i: number, c: Cell) {
    this.board.update(b => b.map((x, k) => (k === i ? c : x)));
  }
  private done(): boolean {
    const r = this.result();
    if (!r) return false;
    if (r === 'draw') { this.draws.update(n => n + 1); this.mood.set('wink'); this.text.set("It's a draw. Well played!"); }
    else if (r.who === 'X') { this.you.update(n => n + 1); this.mood.set('wow'); this.text.set('You win! Try a harder level?'); }
    else { this.me.update(n => n + 1); this.mood.set('party'); this.text.set('Three in a row! One more?'); }
    return true;
  }
  protected again() {
    clearTimeout(this.t);
    this.thinking.set(false);
    this.board.set(Array(9).fill(null));
    this.mood.set('happy');
    this.text.set('You start. Get three in a row.');
  }
  protected pick(l: Level) {
    this.level.set(l);
    this.again();
  }
  ngOnDestroy() {
    clearTimeout(this.t);
  }
}

/** Wait for green, then tap. */
@Component({
  selector: 'app-reaction', changeDetection: ChangeDetectionStrategy.OnPush, imports: [Icon],
  template: `
    <div class="hud mono"><span>last <b>{{ last() ? last() + ' ms' : '–' }}</b></span><span>average <b>{{ average() ? average() + ' ms' : '–' }}</b></span><span><app-icon name="trophy" [size]="13" /> best <b>{{ bestMs() ? bestMs() + ' ms' : '–' }}</b></span></div>
    <button type="button" class="pad" [class]="state()" (pointerdown)="tap($event)" (keydown.enter)="key($event)" (keydown.space)="key($event)">
      <span aria-live="assertive"><b>{{ title() }}</b>{{ hint() }}</span>
    </button>
    <small>Tap, click, or press Space. Most people need 200 to 300 ms.</small>`,
  styles: [SHARED, `
    .pad { height: 300px; border-radius: 22px; border: 1px solid var(--line-2); cursor: pointer; color: #fff; background: #334155; touch-action: manipulation; user-select: none; } .pad span { display: grid; gap: 8px; font-size: 1rem; } .pad b { font: 800 2rem/1.1 var(--display); }
    .pad.wait { background: #9f1239; } .pad.go { background: #15803d; } .pad.early { background: #92400e; } .pad.done { background: #1d4ed8; }`],
})
export class Reaction implements OnDestroy {
  protected readonly state = signal<'idle' | 'wait' | 'go' | 'early' | 'done'>('idle');
  protected readonly last = signal(0);
  private readonly tries = signal<number[]>([]);
  protected readonly average = computed(() => { const t = this.tries(); return t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length) : 0; });
  protected readonly bestMs = signal(best('kv-reaction'));
  protected readonly title = computed(() => ({ idle: 'Tap to start', wait: 'Wait…', go: 'TAP!', early: 'Too early!', done: `${this.last()} ms` })[this.state()]);
  protected readonly hint = computed(() => ({ idle: 'Then wait for green.', wait: 'Not yet.', go: 'Now!', early: 'Wait for green. Tap to try again.', done: this.last() && this.last() === this.bestMs() ? 'Your best so far! Tap to go again.' : 'Tap to go again.' })[this.state()]);
  private t?: ReturnType<typeof setTimeout>;
  private since = 0;

  protected key(e: Event) {
    e.preventDefault();
    if (!(e as KeyboardEvent).repeat) this.act();
  }
  protected tap(e: PointerEvent) {
    if (e.button === 0) this.act();
  }
  private act() {
    switch (this.state()) {
      case 'wait': clearTimeout(this.t); this.state.set('early'); break;
      case 'go': {
        const ms = Math.round(performance.now() - this.since);
        this.last.set(ms);
        this.tries.update(a => [...a, ms].slice(-5));
        if (!this.bestMs() || ms < this.bestMs()) { this.bestMs.set(ms); save('kv-reaction', ms); }
        this.state.set('done');
        break;
      }
      default:
        this.state.set('wait');
        this.t = setTimeout(() => { this.state.set('go'); this.since = performance.now(); }, 1200 + Math.random() * 2300);
    }
  }
  ngOnDestroy() {
    clearTimeout(this.t);
  }
}

const SECONDS = 30;
/** Move the tray, catch the coffee, dodge the bugs. */
@Component({
  selector: 'app-catch', changeDetection: ChangeDetectionStrategy.OnPush, imports: [Icon],
  template: `
    <div class="hud mono"><span>score <b>{{ points() }}</b></span><span>time <b>{{ left() }}s</b></span><span><app-icon name="trophy" [size]="13" /> best <b>{{ bestPoints() }}</b></span></div>
    <div #field class="field-area" tabindex="0" role="group" aria-label="Game field. Use the left and right arrow keys to move the tray." (pointermove)="point($event)" (pointerdown)="point($event)" (keydown)="key($event, true)" (keyup)="key($event, false)" (blur)="dir = 0">
      @for (d of drops(); track d.id) { <span class="drop" aria-hidden="true" [style.left.%]="d.x" [style.top.%]="d.y">{{ icon[d.kind].icon }}</span> }
      @if (flash(); as f) { <span class="pop" [class.bad]="f.n < 0" [style.left.%]="f.x" aria-hidden="true">{{ f.n > 0 ? '+' : '' }}{{ f.n }}</span> }
      <span class="tray" aria-hidden="true" [style.left.%]="tray()"></span>
      @if (!running()) {
        <div class="start">
          @if (played()) { <p class="big" role="status">{{ points() }} points{{ points() > 0 && points() === bestPoints() ? ', your best!' : '' }}</p> }
          <p>☕ +1 &nbsp; ⭐ +3 &nbsp; 🐛 −2<br>Move with the mouse, your finger or the arrow keys.</p>
          <button type="button" class="btn hot" (click)="start()"><app-icon name="play" [size]="14" /> {{ played() ? 'Play again' : 'Start' }}</button>
        </div>
      }
    </div>`,
  styles: [SHARED, `
    .field-area { position: relative; height: 360px; border-radius: 20px; overflow: hidden; border: 1px solid var(--line-2); touch-action: none; outline-offset: -3px; background: linear-gradient(180deg, color-mix(in srgb, var(--violet) 22%, transparent), color-mix(in srgb, #b45309 26%, transparent)), var(--solid); }
    .drop { position: absolute; transform: translate(-50%, -50%); font-size: 1.9rem; line-height: 1; pointer-events: none; }
    .tray { position: absolute; bottom: 5%; width: 20%; height: 16px; transform: translateX(-50%); border-radius: 4px 4px 16px 16px; background: linear-gradient(180deg, #fdba74, #c2410c); box-shadow: 0 8px 18px -6px #000; pointer-events: none; }
    .pop { position: absolute; bottom: 16%; transform: translateX(-50%); font: 800 1.3rem var(--mono); color: #4ade80; pointer-events: none; animation: up 0.6s forwards; } .pop.bad { color: #fb7185; } @keyframes up { to { transform: translate(-50%, -40px); opacity: 0; } }
    .start { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 14px; padding: 20px; text-align: center; color: var(--ink-2); background: color-mix(in srgb, var(--solid) 55%, transparent); } .big { font: 800 1.7rem var(--display); color: var(--ink); }`],
})
export class CoffeeCatch implements OnDestroy {
  protected readonly icon = DROP;
  protected readonly running = signal(false);
  protected readonly played = signal(false);
  protected readonly points = signal(0);
  protected readonly left = signal(SECONDS);
  protected readonly bestPoints = signal(best('kv-catch'));
  protected readonly tray = signal(50);
  protected readonly drops = signal<Drop[]>([]);
  protected readonly flash = signal<{ n: number; x: number } | null>(null);
  protected dir = 0;
  private field = viewChild.required<ElementRef<HTMLElement>>('field');
  private raf = 0;
  private time = 0;
  private wait = 0;
  private id = 0;
  private flashT?: ReturnType<typeof setTimeout>;

  protected start() {
    this.points.set(0); this.left.set(SECONDS); this.drops.set([]); this.tray.set(50); this.flash.set(null);
    this.time = 0; this.wait = 0; this.dir = 0;
    this.running.set(true);
    this.played.set(true);
    this.field().nativeElement.focus({ preventScroll: true });
    let last = performance.now();
    const loop = (now: number) => {
      this.step(Math.min(0.05, (now - last) / 1000)); // a hidden tab pauses the game
      last = now;
      if (this.running()) this.raf = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(loop);
  }
  private step(dt: number) {
    this.time += dt;
    this.left.set(Math.max(0, Math.ceil(SECONDS - this.time)));
    if (this.dir) this.tray.update(x => this.clamp(x + this.dir * 85 * dt));
    this.wait -= dt;
    const list = this.drops().map(d => ({ ...d, y: d.y + d.v * dt }));
    if (this.wait <= 0) { list.push(newDrop(++this.id, this.time)); this.wait = Math.max(0.35, 0.75 - this.time * 0.012); }
    const keep: Drop[] = [];
    for (const d of list) {
      if (caught(d, this.tray())) this.add(DROP[d.kind].points, d.x);
      else if (d.y < 106) keep.push(d);
    }
    this.drops.set(keep);
    if (this.time >= SECONDS) this.end();
  }
  private add(n: number, x: number) {
    this.points.update(p => Math.max(0, p + n));
    clearTimeout(this.flashT);
    this.flash.set({ n, x });
    this.flashT = setTimeout(() => this.flash.set(null), 600);
  }
  private end() {
    this.running.set(false);
    this.drops.set([]);
    if (this.points() > this.bestPoints()) { this.bestPoints.set(this.points()); save('kv-catch', this.points()); }
  }
  private clamp = (x: number) => Math.max(10, Math.min(90, x));
  protected point(e: PointerEvent) {
    if (!this.running()) return;
    const r = this.field().nativeElement.getBoundingClientRect();
    this.tray.set(this.clamp(((e.clientX - r.left) / r.width) * 100));
  }
  protected key(e: KeyboardEvent, down: boolean) {
    const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (!d || !this.running()) return;
    e.preventDefault();
    if (down) this.dir = d;
    else if (this.dir === d) this.dir = 0;
  }
  ngOnDestroy() {
    this.running.set(false);
    cancelAnimationFrame(this.raf);
    clearTimeout(this.flashT);
  }
}
