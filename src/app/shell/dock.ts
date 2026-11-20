import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Icon } from '../core/icon';
import { APPS, OsService } from '../core/os.service';

/** macOS-style dock: icons swell under the cursor; a dot marks running apps. */
@Component({
  selector: 'app-dock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <nav class="dock" #dock (pointermove)="hover($event)" (pointerleave)="mx.set(-1)" aria-label="Dock">
      @for (a of apps; track a.id; let i = $index) {
        <button type="button" class="it" [class.extra]="i >= 4" [style.--s]="scale(i)" (click)="os.dockClick(a.id)" [attr.aria-label]="a.title" [attr.data-tip]="a.title">
          <span class="ic" [style.--c]="a.color"><app-icon [name]="a.icon" [size]="22" /></span>
          @if (os.isOpen(a.id)) { <i class="run"></i> }
        </button>
      }
      <span class="sep"></span>
      <button type="button" class="it" [style.--s]="scale(apps.length)" (click)="os.dockClick('guestbook')" aria-label="Guestbook" data-tip="Guestbook">
        <span class="ic" style="--c:#f59e0b"><app-icon name="message" [size]="22" /></span>@if (os.isOpen('guestbook')) { <i class="run"></i> }
      </button>
      <button type="button" class="it extra" [style.--s]="scale(apps.length + 1)" (click)="os.dockClick('games')" aria-label="Arcade" data-tip="Arcade">
        <span class="ic" style="--c:#ef4444"><app-icon name="gamepad" [size]="22" /></span>@if (os.isOpen('games')) { <i class="run"></i> }
      </button>
      <button type="button" class="it extra" [style.--s]="scale(apps.length + 2)" (click)="os.dockClick('resume')" aria-label="Resume" data-tip="Resume.pdf">
        <span class="ic" style="--c:#64748b"><app-icon name="file" [size]="22" /></span>@if (os.isOpen('resume')) { <i class="run"></i> }
      </button>
    </nav>
  `,
  styles: `
    :host { position: fixed; left: 50%; bottom: 12px; z-index: 150; transform: translateX(-50%); }
    .dock { display: flex; align-items: flex-end; gap: 6px; padding: 8px 10px; border-radius: 22px; background: color-mix(in srgb, var(--solid) 50%, transparent);
      backdrop-filter: blur(24px) saturate(1.5); border: 1px solid var(--line-2); box-shadow: var(--shadow); }
    .it { position: relative; width: 50px; height: 50px; padding: 0; border: 0; background: none; cursor: pointer; transform-origin: bottom center;
      transform: scale(var(--s, 1)) translateY(calc((var(--s, 1) - 1) * -6px)); transition: transform 0.12s ease-out; }
    .ic { width: 100%; height: 100%; display: grid; place-items: center; border-radius: 14px; color: #fff;
      background: linear-gradient(145deg, color-mix(in srgb, var(--c) 85%, #fff), color-mix(in srgb, var(--c) 70%, #000)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 16px -8px var(--c); }
    .run { position: absolute; left: 50%; bottom: -6px; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; background: var(--ink); }
    .sep { width: 1px; align-self: stretch; margin: 6px 4px; background: var(--line-2); }
    .it[data-tip]:hover::after { content: attr(data-tip); position: absolute; bottom: calc(100% + 14px); left: 50%; transform: translateX(-50%) scale(calc(1 / var(--s, 1))); transform-origin: bottom;
      white-space: nowrap; padding: 4px 10px; border-radius: 8px; background: var(--solid); border: 1px solid var(--line-2); font-size: 0.74rem; font-weight: 600; pointer-events: none; }
    @media (max-width: 760px) {
      :host { bottom: max(10px, env(safe-area-inset-bottom)); }
      .it { width: 46px; height: 46px; transform: none; }
      .extra { display: none; }
      .it[data-tip]:hover::after { display: none; }
    }
  `,
})
export class Dock {
  protected readonly os = inject(OsService);
  protected readonly apps = APPS.filter(a => a.dock);
  protected readonly mx = signal(-1);
  private dock = viewChild.required<ElementRef<HTMLElement>>('dock');

  protected hover(e: PointerEvent) {
    if (e.pointerType !== 'mouse') return;
    this.mx.set(e.clientX - this.dock().nativeElement.getBoundingClientRect().left);
  }
  /** Magnification: icons within ~2 slots of the cursor grow, peaking at 1.55×. */
  protected scale(i: number) {
    const x = this.mx();
    if (x < 0) return 1;
    const center = 10 + i * 56 + 25 + (i >= this.apps.length ? 13 : 0);
    const d = Math.abs(x - center) / 56;
    return d > 2 ? 1 : (1 + 0.55 * Math.cos((d / 2) * (Math.PI / 2))).toFixed(3);
  }
}
