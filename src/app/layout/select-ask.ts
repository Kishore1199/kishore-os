import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { AssistantService } from '../core/assistant.service';
import { Icon } from '../core/icon';

/** Select any text on the page, then ask ALPHA about it. */
@Component({
  selector: 'app-select-ask',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `@if (at(); as p) { <button type="button" [style.left.px]="p.x" [style.top.px]="p.y" (pointerdown)="$event.preventDefault()" (click)="ask()"><app-icon name="spark" [size]="13" /> Ask ALPHA</button> }`,
  styles: `button { position: fixed; z-index: 220; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 0; cursor: pointer; background: var(--text); color: var(--bg); font-size: 0.8rem; font-weight: 600; box-shadow: var(--shadow); pointer-events: auto; }`,
})
export class SelectAsk {
  private kai = inject(AssistantService);
  protected readonly at = signal<{ x: number; y: number } | null>(null);
  private text = '';

  constructor() {
    let t: ReturnType<typeof setTimeout>;
    const later = () => { clearTimeout(t); t = setTimeout(() => this.look(), 250); };
    const hide = () => { if (this.at()) this.at.set(null); };
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      document.addEventListener('selectionchange', later);
      addEventListener('scroll', hide, { passive: true, capture: true });
      destroy.onDestroy(() => { clearTimeout(t); document.removeEventListener('selectionchange', later); removeEventListener('scroll', hide, { capture: true }); });
    });
  }

  private look() {
    const s = getSelection();
    const node = s?.anchorNode instanceof Element ? s.anchorNode : s?.anchorNode?.parentElement;
    const text = s?.toString().replace(/\s+/g, ' ').trim() ?? '';
    // only the page's own content: not forms, dialogs or the chat
    if (!s?.rangeCount || text.length < 3 || !node?.closest('app-window > .body') || node.closest('input, textarea, dialog, app-terminal, [contenteditable]')) { this.at.set(null); return; }
    const r = s.getRangeAt(0).getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) { this.at.set(null); return; }
    this.text = text.slice(0, 300);
    this.at.set({ x: Math.min(innerWidth - 80, Math.max(80, r.left + r.width / 2)), y: r.bottom + 50 < innerHeight ? r.bottom + 10 : Math.max(10, r.top - 48) });
  }

  protected ask() {
    this.at.set(null);
    getSelection()?.removeAllRanges();
    this.kai.chatOpen.set(true);
    void this.kai.ask(`Explain this from the page: "${this.text}"`);
  }
}
