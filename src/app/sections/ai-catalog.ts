import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Icon } from '../core/icon';
import { AiList } from './ai-list';
import { AiOrbit } from './ai-orbit';

const KEY = 'kv-ai-view';
type View = 'orbit' | 'list';

/** All AI options: as an orbit to play with, or as a plain list. */
@Component({
  selector: 'app-ai-catalog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AiList, AiOrbit, Icon],
  template: `
    <div class="view" role="group" aria-label="View">
      <button type="button" [attr.aria-pressed]="view() === 'orbit'" (click)="set('orbit')"><app-icon name="globe" [size]="14" /> Orbit</button>
      <button type="button" [attr.aria-pressed]="view() === 'list'" (click)="set('list')"><app-icon name="list-check" [size]="14" /> List</button>
    </div>
    @if (view() === 'orbit') { <app-ai-orbit /> } @else { <app-ai-list /> }
  `,
  styles: `
    :host { display: block; position: relative; }
    .view { display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 14px; border-radius: 14px; border: 1px solid var(--border-strong); background: var(--surface); }
    .view button { display: inline-flex; align-items: center; gap: 7px; padding: 8px 15px; border-radius: 10px; border: 0; background: none; color: var(--text-2); font-size: 0.82rem; font-weight: 600; cursor: pointer; }
    @container (min-width: 761px) { .view { position: absolute; right: 0; top: 4px; z-index: 2; margin: 0; } }
    .view button[aria-pressed='true'] { color: var(--bg); background: var(--text); }
  `,
})
export class AiCatalog {
  protected readonly view = signal<View>(this.load());

  protected set(v: View) {
    this.view.set(v);
    try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ }
  }

  private load(): View {
    try { return localStorage.getItem(KEY) === 'list' ? 'list' : 'orbit'; } catch { return 'orbit'; }
  }
}
