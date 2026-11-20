import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Icon } from '../core/icon';
import { KaiService } from '../core/kai.service';
import { NARRATION } from '../core/kai.brain';
import { OsService, Win, appDef } from '../core/os.service';

/** A desktop window: drag by the title bar, resize from the corner, double-click to maximise. */
@Component({
  selector: 'app-window',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: {
    '[class.focused]': 'os.focused() === win().id',
    '[class.max]': 'win().max',
    '[class.min]': 'win().min',
    '[style.left.px]': 'win().max ? 0 : win().x',
    '[style.top.px]': 'win().max ? 40 : win().y',
    '[style.width]': "win().max ? '100vw' : win().w + 'px'",
    '[style.height]': "win().max ? 'calc(100dvh - 40px)' : win().h + 'px'",
    '[style.z-index]': 'win().z',
    '[style.view-transition-name]': "'win-' + win().id",
    '(pointerdown)': 'os.focus(win().id)',
    role: 'dialog',
    '[attr.aria-label]': 'def().title',
  },
  template: `
    <div class="titlebar" (pointerdown)="drag($event)" (dblclick)="os.toggleMax(win().id)">
      <div class="lights">
        <button type="button" class="l close" (click)="os.close(win().id)" aria-label="Close"><app-icon name="close" [size]="9" /></button>
        <button type="button" class="l min" (click)="os.minimize(win().id)" aria-label="Minimise"><app-icon name="minus" [size]="9" /></button>
        <button type="button" class="l max" (click)="os.toggleMax(win().id)" aria-label="Maximise"><app-icon name="maximize" [size]="9" /></button>
      </div>
      <span class="title"><span class="ico" [style.background]="def().color"><app-icon [name]="def().icon" [size]="12" /></span>{{ def().title }}</span>
      <button type="button" class="explain" [class.on]="kai.voice.speaking()" (click)="narrate()" (pointerdown)="$event.stopPropagation()" aria-label="ALPHA, explain this window">
        <app-icon name="volume" [size]="13" /> <span>Explain</span>
      </button>
    </div>
    <div class="body"><ng-content /></div>
    @if (!win().max) { <span class="grip" (pointerdown)="resize($event)" aria-hidden="true"></span> }
  `,
  styles: `
    :host { position: fixed; display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; background: var(--glass); backdrop-filter: blur(28px) saturate(1.5);
      border: 1px solid var(--line-2); box-shadow: var(--shadow), inset 0 1px 0 rgba(255,255,255,0.06); animation: fade-up 0.25s ease both; contain: layout paint; }
    :host(.focused) { box-shadow: 0 50px 100px -30px rgba(0,0,0,0.75), 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent); }
    :host(:not(.focused)) .titlebar { opacity: 0.75; }
    :host(.max) { border-radius: 0; }
    :host(.min) { display: none; }
    .titlebar { flex-shrink: 0; height: 42px; display: flex; align-items: center; gap: 12px; padding: 0 10px 0 14px; cursor: grab; user-select: none; touch-action: none; border-bottom: 1px solid var(--line); }
    .titlebar:active { cursor: grabbing; }
    .lights { display: flex; gap: 8px; }
    .l { width: 13px; height: 13px; padding: 0; border-radius: 50%; border: 0; display: grid; place-items: center; color: transparent; cursor: pointer; }
    .lights:hover .l { color: rgba(0,0,0,0.6); }
    .close { background: #ff5f57; } .min { background: #febc2e; } .max { background: #28c840; }
    .title { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 0.86rem; margin-right: 40px; white-space: nowrap; overflow: hidden; }
    .ico { width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; color: #fff; flex-shrink: 0; }
    .explain { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--line-2); background: none; cursor: pointer; font: 600 0.72rem var(--mono); color: var(--ink-2); }
    .explain:hover, .explain.on { color: var(--teal); border-color: var(--teal); }
    .body { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; }
    .grip { position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; cursor: nwse-resize; touch-action: none;
      background: linear-gradient(135deg, transparent 50%, var(--line-2) 50% 60%, transparent 60% 70%, var(--line-2) 70% 80%, transparent 80%); }
    @media (max-width: 760px) { .title { margin-right: 0; } .explain span { display: none; } }
  `,
})
export class WindowFrame {
  readonly win = input.required<Win>();
  protected readonly os = inject(OsService);
  protected readonly kai = inject(KaiService);
  protected readonly def = computed(() => appDef(this.win().id));

  protected narrate() {
    const id = this.win().id;
    if (this.kai.voice.speaking()) { this.kai.voice.stop(); return; }
    this.kai.explain(id, this.os.narrators.get(id)?.() ?? NARRATION[id]);
  }

  protected drag(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('button') || this.win().max || e.button !== 0) return;
    const w = this.win(), sx = e.clientX - w.x, sy = e.clientY - w.y, id = w.id;
    this.track(e, ev => this.os.move(id, ev.clientX - sx, ev.clientY - sy));
  }
  protected resize(e: PointerEvent) {
    e.stopPropagation();
    const w = this.win(), sx = e.clientX, sy = e.clientY, id = w.id;
    this.track(e, ev => this.os.resize(id, w.w + ev.clientX - sx, w.h + ev.clientY - sy));
  }
  private track(e: PointerEvent, fn: (ev: PointerEvent) => void) {
    e.preventDefault();
    let raf = 0, last: PointerEvent | null = null;
    const move = (ev: PointerEvent) => { last = ev; if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (last) fn(last); }); };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  }
}
