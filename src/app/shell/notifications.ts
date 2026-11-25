import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Icon } from '../core/icon';
import { NotificationService } from '../core/notification.service';

/** The panel under the bell in the menu bar. */
@Component({
  selector: 'app-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, Icon],
  host: { '(document:keydown.escape)': 'c.open.set(false)' },
  template: `
    @if (c.open()) {
      <div class="veil" (click)="c.open.set(false)"></div>
      <section class="panel" role="dialog" aria-label="Notifications">
        <header><b>Notifications</b>@if (c.notes().length) { <button type="button" (click)="c.clear()">Clear all</button> }</header>
        <ul>
          @for (n of c.notes(); track n.id) {
            <li>
              <span class="ic"><app-icon [name]="n.icon" [size]="15" /></span>
              <div><b>{{ n.title }}</b><p>{{ n.text }}</p>
                <small class="mono">{{ n.at | date: 'shortTime' }}</small>
                @if (n.action) { <button type="button" class="act" (click)="c.act(n)">{{ n.action }}</button> }
              </div>
              <button type="button" class="x" (click)="c.dismiss(n)" [attr.aria-label]="'Dismiss ' + n.title"><app-icon name="close" [size]="12" /></button>
            </li>
          } @empty { <li class="none">You're all caught up.</li> }
        </ul>
      </section>
    }
  `,
  styles: `
    .veil { position: fixed; inset: 40px 0 0; z-index: 300; }
    .panel { position: fixed; right: 10px; top: 48px; z-index: 301; width: min(350px, calc(100vw - 20px)); max-height: min(560px, calc(100dvh - 70px)); display: flex; flex-direction: column; border-radius: 18px; overflow: hidden;
      background: color-mix(in srgb, var(--solid) 94%, transparent); backdrop-filter: blur(24px); border: 1px solid var(--line-2); box-shadow: var(--shadow); animation: fade-up 0.2s; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px 10px; }
    header button, .act { border: 0; background: none; padding: 4px 0; color: var(--accent); font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: underline; }
    ul { list-style: none; margin: 0; padding: 0 10px 12px; overflow-y: auto; display: grid; gap: 8px; }
    li { display: flex; gap: 11px; padding: 12px; border-radius: 14px; background: var(--glass-2); border: 1px solid var(--line); font-size: 0.86rem; }
    li div { flex: 1; min-width: 0; } li p { color: var(--ink-2); overflow-wrap: anywhere; } li small { color: var(--ink-2); font-size: 0.68rem; } .act { margin-left: 12px; }
    .ic { width: 30px; height: 30px; flex-shrink: 0; display: grid; place-items: center; border-radius: 9px; color: #fff; background: linear-gradient(135deg, var(--violet), #c2410c); }
    .x { align-self: start; width: 26px; height: 26px; display: grid; place-items: center; border: 0; border-radius: 8px; background: none; cursor: pointer; color: var(--ink-2); } .x:hover { background: var(--glass-2); color: var(--ink); }
    .none { justify-content: center; color: var(--ink-2); }
  `,
})
export class Notifications {
  protected readonly c = inject(NotificationService);
}
