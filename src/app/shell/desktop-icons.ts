import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { Icon } from '../core/icon';
import { IconLayout, Spot, layout } from '../core/icon-layout.service';
import { APPS, AppId, OsService } from '../core/os.service';

const W = 96, H = 100; // one cell on a big screen
const PHONE_H = 98, PHONE_COLS = 4;
const HOLD_MS = 380; // press this long on a phone, so scrolling still works

interface Drag { id: AppId; x: number; y: number; dx: number; dy: number; on: boolean; touch: boolean; }

/** The app icons. Drag them anywhere (press and hold first on a phone), or move the focused one with Alt and the arrow keys. */
@Component({
  selector: 'app-desktop-icons',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { '[class.phone]': 'phone()' },
  template: `
    <nav #nav aria-label="Desktop apps" [style.height.px]="phone() ? phoneRows() * ${PHONE_H} : null">
      <p id="icon-help" class="sr">Press Alt and an arrow key to move an icon.</p>
      <p class="sr" aria-live="polite">{{ said() }}</p>
      @if (target(); as t) { <span class="drop" [style.left.px]="t.x" [style.top.px]="t.y" [style.width.px]="cellW()" aria-hidden="true"></span> }
      @for (a of apps; track a.id) {
        @let p = at(a.id);
        <button type="button" class="di" [class.drag]="dragging() === a.id" [class.ready]="ready()" [style.left.px]="p.x" [style.top.px]="p.y" [style.width.px]="cellW()"
                [attr.aria-label]="'Open ' + a.title" aria-describedby="icon-help" aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight"
                (pointerdown)="down($event, a.id)" (contextmenu)="menu($event)" (click)="open(a.id)" (keydown)="key($event, a.id)" (dragstart)="$event.preventDefault()">
          <span class="ic" [style.--c]="a.color"><app-icon [name]="a.icon" [size]="24" /></span>
          <span class="lb">{{ a.title }}</span>
        </button>
      }
    </nav>
  `,
  styles: `
    :host { position: absolute; inset: 18px 18px 100px; pointer-events: none; }
    nav { position: relative; height: 100%; }
    .sr { position: absolute; width: 1px; height: 1px; margin: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .di { position: absolute; height: ${H - 4}px; pointer-events: auto; display: grid; justify-items: center; align-content: start; gap: 6px; padding: 8px 4px; border: 0; border-radius: 14px; background: none; cursor: pointer; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
    .di.ready { transition: left 0.22s ease, top 0.22s ease; }
    .di:hover, .di:focus-visible { background: color-mix(in srgb, var(--solid) 40%, transparent); }
    .di.drag { z-index: 5; transition: none; cursor: grabbing; background: color-mix(in srgb, var(--solid) 55%, transparent); } .di.drag .ic { transform: scale(1.14); box-shadow: 0 22px 34px -12px #000; }
    .ic { width: 52px; height: 52px; border-radius: 15px; display: grid; place-items: center; color: #fff; pointer-events: none;
      background: linear-gradient(145deg, color-mix(in srgb, var(--c) 85%, #fff), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 22px -10px var(--c); transition: transform 0.18s; }
    .di:hover .ic { transform: translateY(-3px) scale(1.05); }
    .lb { font-size: 0.74rem; font-weight: 600; text-align: center; line-height: 1.2; text-shadow: 0 1px 6px rgba(0,0,0,0.45); color: #fff; pointer-events: none; }
    :host-context([data-theme='light']) .lb { color: var(--ink); text-shadow: none; }
    :host-context([data-wallpaper]) .lb { color: #fff; text-shadow: 0 1px 2px #000, 0 0 8px rgba(0, 0, 0, 0.85); }
    .drop { position: absolute; height: ${H - 4}px; border-radius: 14px; border: 2px dashed var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
    :host(.phone) { position: static; display: block; } :host(.phone) .di { touch-action: pan-y; }
    @media (prefers-reduced-motion: reduce) { .di.ready { transition: none; } }
  `,
})
export class DesktopIcons {
  private os = inject(OsService);
  private store = inject(IconLayout);
  private nav = viewChild.required<ElementRef<HTMLElement>>('nav');
  protected readonly apps = APPS;
  protected readonly phone = signal(innerWidth <= 760);
  private readonly size = signal({ w: innerWidth - 36, h: innerHeight - 158 });
  /** things that cover the desktop: the cards and the assistant's corner */
  private readonly covered = signal<DOMRect[]>([]);
  private readonly origin = signal({ x: 18, y: 58 });
  /** transitions start after the first layout, so icons don't fly in */
  protected readonly ready = signal(false);
  private readonly drag = signal<Drag | null>(null);
  protected readonly dragging = computed(() => (this.drag()?.on ? this.drag()!.id : null));
  protected readonly said = signal('');
  private swallow = false;

  protected readonly cellW = computed(() => (this.phone() ? this.size().w / PHONE_COLS : W - 4));
  private readonly cols = computed(() => Math.max(1, Math.floor(this.size().w / W)));
  private readonly rows = computed(() => Math.max(1, Math.floor(this.size().h / H)));
  protected readonly phoneRows = computed(() => Math.ceil(APPS.length / PHONE_COLS));
  private readonly cells = computed(() => layout(this.store.spots(), this.cols(), this.rows(), s => this.free(s)));

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const nav = this.nav().nativeElement;
      const ro = new ResizeObserver(() => this.measure());
      ro.observe(nav);
      const cards = document.querySelector('app-desktop .widgets');
      if (cards) ro.observe(cards);
      const onResize = () => this.measure();
      addEventListener('resize', onResize);
      // a finger that is carrying an icon must not scroll the screen
      const still = (e: TouchEvent) => { if (this.drag()?.on) e.preventDefault(); };
      nav.addEventListener('touchmove', still, { passive: false });
      this.measure();
      setTimeout(() => this.ready.set(true), 60);
      setTimeout(() => this.measure(), 800); // the cards have settled
      destroy.onDestroy(() => { ro.disconnect(); removeEventListener('resize', onResize); nav.removeEventListener('touchmove', still); this.stop?.(); });
    });
  }

  private measure() {
    const r = this.nav().nativeElement.getBoundingClientRect();
    this.phone.set(innerWidth <= 760);
    this.size.set({ w: r.width, h: r.height });
    this.origin.set({ x: r.left, y: r.top });
    const cards = [...document.querySelectorAll('app-desktop .widgets .w')].map(e => e.getBoundingClientRect()).filter(x => x.width);
    this.covered.set(innerWidth <= 760 ? [] : [...cards, new DOMRect(innerWidth - 150, innerHeight - 205, 150, 205)]);
  }
  /** nothing lies on top of this cell */
  private free(s: Spot) {
    const o = this.origin(), x = o.x + s.c * W, y = o.y + s.r * H;
    return !this.covered().some(b => x < b.right && x + W - 4 > b.left && y < b.bottom && y + H - 4 > b.top);
  }

  private cell(id: AppId): { x: number; y: number } {
    if (this.phone()) { const i = this.store.order().indexOf(id); return { x: (i % PHONE_COLS) * this.cellW(), y: Math.floor(i / PHONE_COLS) * PHONE_H }; }
    const s = this.cells().get(id)!;
    return { x: s.c * W, y: s.r * H };
  }
  protected at(id: AppId) {
    const d = this.drag();
    return d?.on && d.id === id ? { x: d.x, y: d.y } : this.cell(id);
  }

  // ───────── dragging ─────────

  /** the cell under the icon being carried */
  private readonly over = computed<Spot | null>(() => {
    const d = this.drag();
    if (!d?.on || this.phone()) return null;
    const s = { c: Math.max(0, Math.min(this.cols() - 1, Math.round(d.x / W))), r: Math.max(0, Math.min(this.rows() - 1, Math.round(d.y / H))) };
    return this.free(s) ? s : null;
  });
  protected readonly target = computed(() => { const s = this.over(); return s && { x: s.c * W, y: s.r * H }; });
  private stop?: () => void;

  protected down(e: PointerEvent, id: AppId) {
    if (e.button !== 0 || this.drag()) return;
    const touch = e.pointerType !== 'mouse', hold = touch && this.phone();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY, dx = sx - r.left, dy = sy - r.top;
    this.swallow = false;
    const place = (x: number, y: number) => { const n = this.nav().nativeElement.getBoundingClientRect(); this.drag.update(d => d && { ...d, x: x - dx - n.left, y: y - dy - n.top }); };
    const lift = () => { this.drag.set({ id, x: 0, y: 0, dx, dy, on: true, touch }); place(sx, sy); this.swallow = true; if (touch) navigator.vibrate?.(12); };
    let held = !hold, timer: ReturnType<typeof setTimeout> | undefined;
    if (hold) timer = setTimeout(() => { held = true; lift(); }, HOLD_MS);

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const far = Math.hypot(ev.clientX - sx, ev.clientY - sy);
      if (!this.drag()) {
        if (!held) { if (far > 10) finish(false); return; } // scrolling, not holding
        if (far < 6) return;
        lift();
      }
      place(ev.clientX, ev.clientY);
      if (this.phone()) this.reorder(id);
    };
    const finish = (keep: boolean) => {
      clearTimeout(timer);
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', cancel);
      removeEventListener('keydown', esc, true);
      this.stop = undefined;
      if (!this.drag()) return;
      const to = this.over();
      this.drag.set(null);
      if (this.phone()) this.store.setOrder(keep ? this.store.order() : before, keep);
      else if (keep && to) this.put(id, to);
      setTimeout(() => (this.swallow = false), 60); // the click that follows a drop
    };
    const before = this.store.order();
    const up = (ev: PointerEvent) => { if (ev.pointerId === e.pointerId) finish(true); };
    const cancel = (ev: PointerEvent) => { if (ev.pointerId === e.pointerId) finish(false); };
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && this.drag()) { ev.stopPropagation(); finish(false); } };
    this.stop = () => finish(false);
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', cancel);
    addEventListener('keydown', esc, true);
  }

  /** Put an icon in a cell; the one that was there takes its old place. */
  private put(id: AppId, to: Spot) {
    const from = this.cells().get(id)!;
    if (from.c === to.c && from.r === to.r) return;
    const other = [...this.cells()].find(([x, s]) => x !== id && s.c === to.c && s.r === to.r)?.[0];
    // every icon keeps the place it has now, so nothing else jumps
    const all = Object.fromEntries(this.cells());
    this.store.move({ ...all, [id]: to, ...(other ? { [other]: from } : {}) });
  }
  /** phones: make room where the icon is held */
  private reorder(id: AppId) {
    const d = this.drag();
    if (!d) return;
    const c = Math.max(0, Math.min(PHONE_COLS - 1, Math.round(d.x / this.cellW()))), r = Math.max(0, Math.min(this.phoneRows() - 1, Math.round(d.y / PHONE_H)));
    const i = Math.min(APPS.length - 1, r * PHONE_COLS + c), list = this.store.order();
    if (list[i] === id) return;
    const rest = list.filter(x => x !== id);
    rest.splice(i, 0, id);
    this.store.setOrder(rest, false);
  }

  // ───────── the rest ─────────

  protected open(id: AppId) {
    if (!this.swallow) this.os.open(id);
  }
  /** a long press must not open the browser's menu on a phone */
  protected menu(e: Event) {
    if (this.phone()) e.preventDefault();
  }

  protected key(e: KeyboardEvent, id: AppId) {
    const d = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
    if (!d || !e.altKey) return;
    e.preventDefault(); // Alt and Left is also "back"
    const title = APPS.find(a => a.id === id)!.title;
    if (this.phone()) {
      const list = this.store.order(), i = list.indexOf(id), to = i + d[0] + d[1] * PHONE_COLS;
      if (to < 0 || to >= list.length) return;
      const rest = list.filter(x => x !== id);
      rest.splice(to, 0, id);
      this.store.setOrder(rest, true);
      this.said.set(`${title}, place ${to + 1} of ${list.length}`);
      return;
    }
    let s = this.cells().get(id)!;
    // step over anything that is covered
    do s = { c: s.c + d[0], r: s.r + d[1] }; while (s.c >= 0 && s.r >= 0 && s.c < this.cols() && s.r < this.rows() && !this.free(s));
    if (s.c < 0 || s.r < 0 || s.c >= this.cols() || s.r >= this.rows()) return;
    this.put(id, s);
    this.said.set(`${title}, column ${s.c + 1}, row ${s.r + 1}`);
  }
}
