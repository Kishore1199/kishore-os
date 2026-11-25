import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, effect, inject, signal, untracked, viewChild, viewChildren } from '@angular/core';
import { CloudService } from '../core/cloud.service';
import { DAILY_REQUESTS } from '../core/ai-budget';
import { Icon } from '../core/icon';
import { ThemeService, prefersReducedMotion } from '../core/theme.service';
import { AI_FEATURES, AI_GROUPS, AiFeature, AiGroup, RUNS_LABEL } from '../data/ai-features.data';
import { AiLauncher, GROUP_COLOR, PATHS, matchFeatures } from './ai-launcher.service';

interface Node { f: AiFeature; i: number; ring: number; slot: number; of: number; }

/** rings from the inside out */
const RINGS: AiGroup[] = ['Behind the scenes', 'Interactive', 'Portfolio AI', 'Developer AI Lab'];
const NODES: Node[] = RINGS.flatMap((g, ring) => { const fs = AI_FEATURES.filter(f => f.group === g); return fs.map((f, slot) => ({ f, i: 0, ring, slot, of: fs.length })); }).map((n, i) => ({ ...n, i }));
const BY_TITLE = new Map(NODES.map(n => [n.f.title, n]));
/** turns per second, alternating direction */
const SPEED = [0.016, -0.011, 0.008, -0.006];
const FRONT = Math.PI / 2;
const GAUGE = 2 * Math.PI * 74;

/**
 * Every AI option as a small solar system: ALPHA's core in the middle, one ring per group.
 * Say what you want (or pick a path) and the matching tools light up, joined in order.
 */
@Component({
  selector: 'app-ai-orbit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <form class="ask" role="search" (submit)="$event.preventDefault(); launch()">
      <span class="prompt mono" aria-hidden="true">›</span>
      <input #box type="search" autocomplete="off" placeholder="What do you want to do? Try “fix an error” or “prepare for an interview”" aria-label="What do you want to do?" [value]="query()" (input)="type($any($event.target).value)" />
      @if (query()) { <span class="hits mono">{{ lit().length ? lit().length + (lit().length === 1 ? ' match' : ' matches') : 'no match' }}</span> }
    </form>
    <div class="paths" role="group" aria-label="Suggested paths">
      @for (p of paths; track p.label) { <button type="button" [attr.aria-pressed]="path() === p.label" (click)="follow(p.label)"><app-icon [name]="p.icon" [size]="14" /> {{ p.label }}</button> }
      <button type="button" class="dice" (click)="surprise()"><app-icon name="shuffle" [size]="14" /> Surprise me</button>
    </div>

    <div class="stage" #stage [class.dim]="lit().length > 0" [class.one]="narrow()" (pointerenter)="hover = true" (pointerleave)="hover = false" (pointerdown)="down($event)">
      <canvas #canvas aria-hidden="true"></canvas>
      <p class="hint mono" aria-hidden="true">drag to spin<br>tap once to look,<br>twice to open</p>
      <div class="core" aria-hidden="true">
        <svg viewBox="0 0 160 160"><circle class="track" cx="80" cy="80" r="74" /><circle class="left" cx="80" cy="80" r="74" [attr.stroke-dasharray]="gauge" [attr.stroke-dashoffset]="gauge * (1 - left() / daily)" /></svg>
        <span class="orb"></span>
        <span class="eyes"><i></i><i></i></span>
      </div>
      <div class="nodes" role="group" aria-label="AI options. Use the arrow keys to move between them." (keydown)="key($event)">
        @for (n of nodes; track n.i) {
          <button #node type="button" class="node" [style.--c]="color(n.f.group)" [class.on]="sel().i === n.i" [class.lit]="isLit(n.i)" [class.off]="off(n)" [class.still]="!n.f.action"
                  [attr.tabindex]="sel().i === n.i ? 0 : -1" [attr.aria-pressed]="sel().i === n.i" [attr.aria-label]="n.f.title" (click)="tap(n)">
            <span class="dot"><app-icon [name]="n.f.icon" [size]="17" />@if (order(n.i); as k) { <em>{{ k }}</em> }</span>
            <span class="lab">{{ n.f.title }}</span>
          </button>
        }
      </div>
    </div>

    <div class="rings" role="group" aria-label="Groups">
      @for (g of groups; track g.name) { <button type="button" [style.--c]="color(g.name)" [attr.aria-pressed]="group() === g.name" (click)="pickGroup(g.name)"><i></i>{{ g.name }} <small>{{ g.n }}</small></button> }
    </div>

    <section class="console" [style.--c]="color(sel().f.group)" aria-label="Selected AI option">
      <span class="big"><app-icon [name]="sel().f.icon" [size]="26" /></span>
      <div class="what" aria-live="polite">
        <small class="mono">{{ path() ? path() + ' · step ' + (order(sel().i) || '–') + ' of ' + lit().length : sel().f.group }}</small>
        <h2>{{ sel().f.title }}</h2>
        <p>{{ sel().f.text }}@if (path()) { <span> {{ pathLine() }}</span> }</p>
        <ol class="flow mono" aria-label="How it runs">
          @for (s of flow(); track s) { <li>{{ s }}</li> }
        </ol>
      </div>
      <div class="go">
        @if (sel().f.action) { <button type="button" class="btn btn-primary" (click)="launch()"><app-icon name="play" [size]="15" /> Launch</button> } @else { <span class="always mono">Always on</span> }
        <div class="step">
          <button type="button" class="icon-btn" (click)="move(-1)" aria-label="Previous option"><app-icon class="flip" name="arrow-right" [size]="16" /></button>
          <button type="button" class="icon-btn" (click)="move(1)" aria-label="Next option"><app-icon name="arrow-right" [size]="16" /></button>
        </div>
        <small class="mono left-text">{{ cloud.enabled ? left() + ' of ' + daily + ' AI requests left today' : 'AI is off' }}</small>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .ask { display: flex; align-items: center; gap: 12px; height: 58px; padding: 0 20px; border-radius: 18px; border: 1px solid var(--border-strong); background: var(--surface); transition: border-color 0.2s, box-shadow 0.2s; }
    .ask:focus-within { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
    .prompt { color: var(--accent); font-size: 1.3rem; } .ask input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; color: var(--text); font: inherit; font-size: 1rem; text-overflow: ellipsis; } .ask input::placeholder { color: var(--text-2); }
    .hits { font-size: 0.74rem; color: var(--text-2); white-space: nowrap; }
    .paths { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; } .paths button { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-2); font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: color 0.2s, border-color 0.2s; }
    .paths button:hover { color: var(--text); border-color: var(--accent); } .paths button[aria-pressed='true'] { color: var(--bg); background: var(--text); border-color: var(--text); } .dice { margin-left: auto; }

    .stage { position: relative; height: clamp(290px, calc(100cqh - 336px), 600px); margin-top: 4px; touch-action: pan-y; cursor: grab; user-select: none; -webkit-mask: linear-gradient(90deg, transparent, #000 2%, #000 98%, transparent); mask: linear-gradient(90deg, transparent, #000 2%, #000 98%, transparent); }
    .stage.spin { cursor: grabbing; }
    canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
    .core { position: absolute; left: 50%; top: 47.5%; width: 118px; height: 118px; margin: -59px; display: grid; place-items: center; }
    .core > * { grid-area: 1 / 1; } .core svg { width: 100%; height: 100%; transform: rotate(-90deg); } .core circle { fill: none; stroke-width: 5; } .track { stroke: var(--border-strong); } .left { stroke: var(--accent); stroke-linecap: round; transition: stroke-dashoffset 0.6s; }
    .orb { width: 88px; height: 88px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff6 0, transparent 35%), conic-gradient(from 0deg, #fb923c, #a78bfa, #22d3ee, #34d399, #fb923c); filter: saturate(1.1); animation: turn 14s linear infinite; box-shadow: 0 0 50px -6px var(--glow); }
    .eyes { display: flex; gap: 13px; padding: 14px 17px; border-radius: 20px; background: #0b0b12; z-index: 1; } .eyes i { width: 8px; height: 14px; border-radius: 6px; background: #67e8f9; animation: blink 5s infinite; }
    @keyframes turn { to { transform: rotate(1turn); } } @keyframes blink { 0%, 94%, 100% { transform: none; } 97% { transform: scaleY(0.1); } }

    .node { position: absolute; left: 0; top: 0; width: 46px; height: 46px; margin: -23px; padding: 0; border: 0; background: none; cursor: pointer; display: grid; place-items: center; will-change: transform; outline: 0; }
    .dot { position: relative; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; color: var(--c); background: var(--surface-solid); border: 1.5px solid color-mix(in srgb, var(--c) 60%, transparent); transition: background 0.25s, color 0.25s, box-shadow 0.25s, transform 0.25s; }
    .still .dot { border-style: dashed; }
    .node:hover .dot, .node.lit .dot { background: color-mix(in srgb, var(--c) 22%, var(--surface-solid)); box-shadow: 0 0 22px -2px var(--c); }
    .node.on .dot { background: var(--c); color: var(--surface-solid); transform: scale(1.22); box-shadow: 0 0 34px 0 var(--c); }
    .node:focus-visible .dot { outline: 3px solid var(--text); outline-offset: 3px; }
    .dot em { position: absolute; top: -7px; right: -7px; width: 19px; height: 19px; border-radius: 50%; display: grid; place-items: center; background: var(--text); color: var(--bg); font: 700 0.68rem 'JetBrains Mono', monospace; }
    .lab { position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); padding: 2px 8px; border-radius: 8px; background: var(--surface-solid); border: 1px solid var(--border); color: var(--text); font-size: 0.72rem; font-weight: 600; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
    .node:hover .lab, .node:focus-visible .lab, .node.on .lab, .node.lit .lab { opacity: 1; } .node:hover { z-index: 999 !important; }
    .node.off .dot { opacity: 0.28; }
    .hint { position: absolute; right: 5%; top: 8px; text-align: right; font-size: 0.68rem; line-height: 1.6; color: var(--text-2); pointer-events: none; }

    .rings { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 6px 0 12px; } .rings button { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-2); font-size: 0.82rem; font-weight: 600; cursor: pointer; }
    .rings i { width: 9px; height: 9px; border-radius: 50%; background: var(--c); } .rings button[aria-pressed='true'] { color: var(--text); border-color: var(--c); box-shadow: inset 0 0 0 1px var(--c); }

    .console { position: relative; display: grid; grid-template-columns: auto 1fr auto; gap: 22px; align-items: center; padding: 18px 22px; border-radius: 22px; border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); background: linear-gradient(120deg, color-mix(in srgb, var(--c) 12%, var(--surface-solid)), var(--surface-solid) 55%); overflow: hidden; transition: border-color 0.4s; }
    .console::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, transparent 0 3px, color-mix(in srgb, var(--c) 4%, transparent) 3px 4px); }
    .big { width: 62px; height: 62px; border-radius: 18px; display: grid; place-items: center; color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); }
    .what { min-width: 0; } .what small { font-size: 0.72rem; color: var(--c); } h2 { font-size: 1.35rem; margin: 2px 0 4px; } .what p { color: var(--text-2); font-size: 0.92rem; }
    .flow { list-style: none; display: flex; flex-wrap: wrap; gap: 6px 0; margin: 9px 0 0; padding: 0; font-size: 0.72rem; color: var(--text-2); } .flow li { padding: 4px 10px; border-radius: 8px; border: 1px solid var(--border-strong); } .flow li + li { margin-left: 26px; position: relative; } .flow li + li::before { content: '→'; position: absolute; left: -20px; color: var(--c); }
    .go { display: grid; justify-items: end; gap: 10px; z-index: 1; } .step { display: flex; gap: 8px; } .flip { transform: scaleX(-1); } .left-text { font-size: 0.68rem; color: var(--text-2); } .always { padding: 9px 14px; border-radius: 12px; border: 1px dashed var(--c); color: var(--c); font-size: 0.8rem; }

    @container (max-width: 760px) {
      .hint { display: none; } .dice { margin-left: 0; } .stage { height: 430px; -webkit-mask: none; mask: none; }
      .console { grid-template-columns: auto 1fr; padding: 18px; gap: 14px; } .big { width: 48px; height: 48px; align-self: start; } .go { grid-column: 1 / -1; grid-template-columns: 1fr auto; justify-items: stretch; align-items: center; } .left-text { grid-column: 1 / -1; }
      .core { width: 92px; height: 92px; margin: -46px; } .orb { width: 68px; height: 68px; } .eyes { padding: 10px 13px; gap: 10px; }
      .stage.one .node.off { visibility: hidden; }
    }
    @media (prefers-reduced-motion: reduce) { .orb, .eyes i { animation: none; } .node .dot { transition: none; } }
  `,
})
export class AiOrbit implements AfterViewInit, OnDestroy {
  protected readonly cloud = inject(CloudService);
  private theme = inject(ThemeService);
  private launcher = inject(AiLauncher);
  private stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private nodeEls = viewChildren<ElementRef<HTMLElement>>('node');

  protected readonly nodes = NODES;
  protected readonly paths = PATHS;
  protected readonly daily = DAILY_REQUESTS;
  protected readonly gauge = GAUGE;
  protected readonly groups = AI_GROUPS.map(name => ({ name, n: NODES.filter(n => n.f.group === name).length }));
  protected readonly query = signal('');
  protected readonly path = signal('');
  protected readonly group = signal<AiGroup | null>(null);
  protected readonly sel = signal<Node>(BY_TITLE.get('Job description matcher') ?? NODES[0]);
  protected readonly left = signal(DAILY_REQUESTS);
  protected readonly narrow = signal(false);
  /** indexes of the highlighted tools, in order */
  protected readonly lit = computed<number[]>(() => {
    const steps = PATHS.find(p => p.label === this.path())?.steps.flatMap(t => BY_TITLE.get(t) ?? []);
    return (steps ?? matchFeatures(AI_FEATURES, this.query()).flatMap(f => BY_TITLE.get(f.title) ?? [])).map(n => n.i);
  });
  protected readonly pathLine = computed(() => PATHS.find(p => p.label === this.path())?.line ?? '');
  protected readonly flow = computed(() => { const r = this.sel().f.runs; return r === 'ai' ? ['You', 'Gemini, or the no-AI version', 'Result'] : r === 'browser' ? ['You', 'Your browser', 'Result'] : ['You', 'Site data, no AI', 'Result']; });
  protected readonly runs = RUNS_LABEL;

  protected hover = false;
  private still = prefersReducedMotion();
  private raf = 0;
  private visible = false;
  private last = 0;
  private w = 0;
  private h = 0;
  private turn = [0.4, 1.1, 0.2, 0.9];
  /** where a ring is easing to, so the selected tool comes to the front */
  private goal: (number | null)[] = [null, null, null, null];
  private pos = NODES.map(() => ({ x: 0, y: 0, z: 0 }));
  private colors = NODES.map(() => '#fff');
  private drag: { x: number; turn: number[]; moved: boolean } | null = null;
  private dragged = false;
  private io?: IntersectionObserver;
  private ro?: ResizeObserver;
  private timer?: ReturnType<typeof setInterval>;
  private readonly wake = () => this.start();

  constructor() {
    effect(() => { const dark = this.theme.isDark(); this.colors = NODES.map(n => GROUP_COLOR[n.f.group][dark ? 0 : 1]); untracked(() => this.start()); });
    effect(() => { const n = this.sel(); untracked(() => { this.front(n); this.start(); }); });
    effect(() => { this.lit(); this.group(); this.narrow(); untracked(() => this.start()); });
  }

  ngAfterViewInit() {
    this.ro = new ResizeObserver(() => this.measure());
    this.ro.observe(this.stage().nativeElement);
    this.io = new IntersectionObserver(es => { this.visible = es[es.length - 1].isIntersecting; this.start(); }); // several changes can arrive together: the last one counts
    this.io.observe(this.stage().nativeElement);
    document.addEventListener('visibilitychange', this.wake);
    const count = () => this.left.set(this.cloud.remaining());
    count();
    this.timer = setInterval(() => { if (this.visible) count(); }, 2500);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
    clearInterval(this.timer);
    this.io?.disconnect();
    this.ro?.disconnect();
    document.removeEventListener('visibilitychange', this.wake);
    removeEventListener('pointermove', this.dragMove);
    removeEventListener('pointerup', this.dragEnd);
    removeEventListener('pointercancel', this.dragEnd);
  }

  // ───────── choosing ─────────

  protected color = (g: AiGroup) => GROUP_COLOR[g][this.theme.isDark() ? 0 : 1];
  protected isLit = (i: number) => this.lit().includes(i);
  protected order = (i: number) => (this.path() ? this.lit().indexOf(i) + 1 : 0);
  /** faded: another group, or not part of the highlighted ones */
  protected off(n: Node): boolean {
    if (this.sel().i === n.i) return false;
    if (this.lit().length) return !this.isLit(n.i);
    const g = this.group() ?? (this.narrow() ? this.sel().f.group : null);
    return !!g && n.f.group !== g;
  }

  protected type(q: string) {
    this.query.set(q);
    this.path.set('');
    this.group.set(null);
    const first = this.lit()[0];
    if (first !== undefined) this.sel.set(NODES[first]);
  }

  protected follow(label: string) {
    this.path.update(p => (p === label ? '' : label));
    this.query.set('');
    this.group.set(null);
    const first = this.lit()[0];
    if (first !== undefined) this.sel.set(NODES[first]);
  }

  protected pickGroup(g: AiGroup) {
    this.group.update(x => (x === g ? null : g));
    this.query.set('');
    this.path.set('');
    if (this.group() && this.sel().f.group !== g) this.sel.set(NODES.find(n => n.f.group === g)!);
  }

  protected surprise() {
    const open = NODES.filter(n => n.f.action && n.i !== this.sel().i);
    this.query.set('');
    this.path.set('');
    this.group.set(null);
    this.sel.set(open[Math.floor(Math.random() * open.length)]);
  }

  /** First tap shows it, the second opens it. */
  protected tap(n: Node) {
    if (this.dragged) return;
    if (this.sel().i === n.i) this.launch();
    else this.sel.set(n);
  }

  protected launch() {
    this.launcher.run(this.sel().f);
  }

  /** Previous or next: within the highlighted ones, else the group, else all. */
  protected move(step: number) {
    const set = this.lit().length ? this.lit().map(i => NODES[i]) : NODES.filter(n => (this.group() ?? this.sel().f.group) === n.f.group);
    const at = set.findIndex(n => n.i === this.sel().i);
    this.sel.set(set[(at + step + set.length) % set.length] ?? set[0]);
  }

  protected key(e: KeyboardEvent) {
    const ring = (d: number) => { const g = RINGS[(this.sel().ring + d + RINGS.length) % RINGS.length]; this.group.set(null); this.path.set(''); this.query.set(''); this.sel.set(NODES.find(n => n.f.group === g)!); };
    switch (e.key) {
      case 'ArrowRight': this.move(1); break;
      case 'ArrowLeft': this.move(-1); break;
      case 'ArrowDown': ring(1); break;
      case 'ArrowUp': ring(-1); break;
      default: return;
    }
    e.preventDefault();
    setTimeout(() => this.nodeEls()[this.sel().i]?.nativeElement.focus({ preventScroll: true }));
  }

  // ───────── spinning ─────────

  protected down(e: PointerEvent) {
    if (e.button) return;
    this.drag = { x: e.clientX, turn: [...this.turn], moved: false };
    this.dragged = false;
    addEventListener('pointermove', this.dragMove);
    addEventListener('pointerup', this.dragEnd);
    addEventListener('pointercancel', this.dragEnd);
  }

  private readonly dragMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 6) return;
    d.moved = this.dragged = true;
    this.stage().nativeElement.classList.add('spin');
    this.goal = [null, null, null, null];
    // the front of a ring follows the pointer
    this.turn = d.turn.map((t, r) => t - dx / this.radius(r).x);
    this.start();
  };

  private readonly dragEnd = () => {
    this.drag = null;
    this.stage().nativeElement.classList.remove('spin');
    removeEventListener('pointermove', this.dragMove);
    removeEventListener('pointerup', this.dragEnd);
    removeEventListener('pointercancel', this.dragEnd);
    setTimeout(() => (this.dragged = false), 60); // swallow the click that follows
  };

  private angle = (n: Node) => this.turn[n.ring] + (n.slot / n.of) * 2 * Math.PI;

  /** Ease the ring the short way until this tool is at the front. */
  private front(n: Node) {
    const diff = (FRONT - this.angle(n)) % (2 * Math.PI);
    this.goal[n.ring] = this.turn[n.ring] + (diff > Math.PI ? diff - 2 * Math.PI : diff < -Math.PI ? diff + 2 * Math.PI : diff);
  }

  /** On a phone only one ring is shown, as an upright oval. */
  private radius(ring: number): { x: number; y: number } {
    if (this.narrow()) return { x: this.w * 0.5 - 34, y: this.h * 0.5 - 52 };
    const x = this.w * [0.155, 0.255, 0.352, 0.44][ring];
    return { x, y: Math.min(this.h * [0.19, 0.265, 0.335, 0.4][ring], x * 0.62) };
  }

  /** a little above the middle, to leave room for the front label */
  private cy = () => this.h * 0.475;

  private measure() {
    const el = this.stage().nativeElement, c = this.canvas().nativeElement;
    this.w = el.clientWidth;
    this.h = el.clientHeight;
    const dpr = Math.min(2, devicePixelRatio || 1);
    c.width = this.w * dpr;
    c.height = this.h * dpr;
    this.narrow.set(this.w <= 716);
    this.start();
  }

  private start() {
    if (this.raf || !this.visible || document.hidden || !this.w) return;
    this.last = 0;
    this.raf = requestAnimationFrame(t => this.frame(t));
  }

  private frame(now: number) {
    this.raf = 0;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    let moving = false;
    for (let r = 0; r < 4; r++) {
      const g = this.goal[r];
      if (g !== null) {
        const d = g - this.turn[r];
        if (this.still || Math.abs(d) < 0.002) { this.turn[r] = g; this.goal[r] = null; }
        else { this.turn[r] += d * Math.min(1, dt * 5); moving = true; }
      } else if (!this.still && !this.hover && !this.drag && r !== this.sel().ring) this.turn[r] += SPEED[r] * 2 * Math.PI * dt; // a moving target is hard to tap, so it waits
    }
    this.place();
    this.draw(now / 1000);
    if (this.visible && !document.hidden && (!this.still || moving)) this.raf = requestAnimationFrame(t => this.frame(t));
  }

  private place() {
    const els = this.nodeEls(), lit = this.lit();
    const first = Math.max(0, lit.indexOf(this.sel().i));
    for (const n of NODES) {
      // on a phone the highlighted tools share one oval, so they are spread evenly, the selected one in front
      const k = this.narrow() && lit.length ? lit.indexOf(n.i) : -1;
      const a = k >= 0 ? FRONT + ((k - first) / lit.length) * 2 * Math.PI : this.angle(n), r = this.radius(n.ring), p = this.pos[n.i];
      p.x = this.w / 2 + Math.cos(a) * r.x;
      p.y = this.cy() + Math.sin(a) * r.y;
      p.z = this.narrow() ? 1 : (Math.sin(a) + 1) / 2;
      const el = els[n.i]?.nativeElement;
      if (!el) continue;
      const on = n.i === this.sel().i || lit.includes(n.i);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(${(on ? 1 : 0.66 + p.z * 0.34).toFixed(3)})`;
      el.style.opacity = on ? '1' : (0.55 + p.z * 0.45).toFixed(2);
      el.style.zIndex = String(on ? 200 + Math.round(p.z * 99) : Math.round(p.z * 99));
    }
  }

  private draw(t: number) {
    const c = this.canvas().nativeElement, g = c.getContext('2d');
    if (!g) return;
    const k = c.width / this.w, cx = this.w / 2, cy = this.cy(), sel = this.sel(), lit = this.lit();
    g.setTransform(k, 0, 0, k, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    // rings
    const only = this.narrow() ? sel.ring : -1;
    for (let r = 0; r < 4; r++) {
      if (only >= 0 && r !== only) continue;
      const { x, y } = this.radius(r);
      g.globalAlpha = r === sel.ring ? 0.6 : 0.22;
      g.strokeStyle = this.colors[NODES.find(n => n.ring === r)!.i];
      g.lineWidth = r === sel.ring ? 1.6 : 1;
      g.setLineDash(r % 2 ? [2, 7] : []);
      g.beginPath();
      g.ellipse(cx, cy, x, y, 0, 0, 2 * Math.PI);
      g.stroke();
    }
    g.setLineDash([]);
    // beams: from the core along the path, or to every match
    const at = (i: number) => this.pos[i];
    const core = { x: cx, y: cy };
    const pairs: [{ x: number; y: number }, { x: number; y: number }, string][] = [];
    if (this.path() && lit.length) lit.forEach((i, j) => pairs.push([j ? at(lit[j - 1]) : core, at(i), this.colors[i]]));
    else for (const i of lit.length ? lit : [sel.i]) pairs.push([core, at(i), this.colors[i]]);
    pairs.forEach(([a, b, color], j) => {
      const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.16, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.16;
      g.strokeStyle = color;
      g.globalAlpha = 0.5;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.quadraticCurveTo(mx, my, b.x, b.y);
      g.stroke();
      if (this.still) return;
      // pulses travelling along the beam
      for (let p = 0; p < 3; p++) {
        const u = (t * 0.5 + p / 3 + j * 0.13) % 1, v = 1 - u;
        g.globalAlpha = 0.95 * Math.sin(u * Math.PI);
        g.fillStyle = color;
        g.beginPath();
        g.arc(v * v * a.x + 2 * v * u * mx + u * u * b.x, v * v * a.y + 2 * v * u * my + u * u * b.y, 3, 0, 2 * Math.PI);
        g.fill();
      }
    });
    g.globalAlpha = 1;
  }
}
