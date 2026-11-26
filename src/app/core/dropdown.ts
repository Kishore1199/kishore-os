import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, model, signal, viewChild } from '@angular/core';

export interface DropOption { value: string; label: string; group?: string }

let uid = 0;

/**
 * Themed replacement for a native <select>. The list opens in the top layer
 * (Popover API), so it is never clipped by dialogs or scroll boxes.
 * Keyboard: arrows, Home/End, Enter/Space, Escape, Tab, and type-to-search.
 */
@Component({
  selector: 'app-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.pill]': "variant() === 'pill'", '[class.mini]': "variant() === 'mini'", '[class.open]': 'open()' },
  template: `
    <button #trigger type="button" class="trigger" role="combobox" [id]="inputId()" [disabled]="disabled()"
            [attr.aria-label]="ariaLabel() || null" aria-haspopup="listbox" [attr.aria-expanded]="open()" [attr.aria-controls]="listId"
            [attr.aria-activedescendant]="open() && active() >= 0 ? listId + '-' + active() : null"
            (click)="toggle()" (keydown)="onKey($event)" (blur)="onBlur($event)">
      <span class="val">{{ current()?.label ?? placeholder() }}</span>
      <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <div #list class="list" popover="manual" role="listbox" [id]="listId" [attr.aria-label]="ariaLabel() || null" tabindex="-1"
         (mousedown)="$event.preventDefault()">
      @for (o of options(); track o.value; let i = $index) {
        @if (o.group && o.group !== options()[i - 1]?.group) { <div class="grp" role="presentation">{{ o.group }}</div> }
        <div class="opt" role="option" [id]="listId + '-' + i" [class.active]="i === active()" [class.sel]="o.value === value()"
             [attr.aria-selected]="o.value === value()" (mouseenter)="active.set(i)" (click)="choose(i)">
          <span>{{ o.label }}</span>
          @if (o.value === value()) { <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; position: relative; min-width: 0; }
    .trigger { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; font: inherit; font-size: 0.88rem; line-height: 1.5; text-align: left;
      color: var(--text); background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 14px; cursor: pointer; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
    .trigger:hover:enabled, :host(.open) .trigger { border-color: var(--accent); }
    :host(.open) .trigger { box-shadow: 0 0 0 3px var(--accent-soft); }
    .trigger:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
    .trigger:disabled { opacity: 0.55; cursor: not-allowed; }
    .val { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chev { flex-shrink: 0; color: var(--text-3); transition: transform 0.2s ease, color 0.2s ease; }
    :host(.open) .chev { transform: rotate(180deg); color: var(--accent); }

    :host(.pill) { display: inline-block; flex-shrink: 0; }
    :host(.pill) .trigger { padding: 5px 10px 5px 12px; gap: 6px; border-radius: 999px; background: var(--surface-solid); color: var(--text-2); font-size: 0.74rem; }
    :host(.pill) .chev { width: 12px; height: 12px; }

    .list { position: fixed; inset: auto; margin: 0; box-sizing: border-box; max-height: 280px; overflow-y: auto; overscroll-behavior: contain; padding: 6px;
      background: var(--surface-solid); color: var(--text); border: 1px solid var(--border-strong); border-radius: 14px; box-shadow: var(--shadow), 0 0 0 1px var(--accent-soft);
      font-family: inherit; font-size: 0.86rem; line-height: 1.4; scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent;
      opacity: 0; transform: translateY(-4px) scale(0.98); transform-origin: top center; transition: opacity 0.14s ease, transform 0.14s ease, display 0.14s allow-discrete, overlay 0.14s allow-discrete; }
    .list:popover-open { opacity: 1; transform: none; }
    @starting-style { .list:popover-open { opacity: 0; transform: translateY(-4px) scale(0.98); } }
    .list.up { transform-origin: bottom center; }
    :host(.mini) { display: inline-block; flex-shrink: 0; }
    :host(.mini) .trigger { height: 26px; padding: 0 8px 0 10px; gap: 5px; border-radius: 999px; background: var(--surface-solid); color: var(--text-2); font-size: 0.72rem; }
    :host(.mini) .chev { width: 11px; height: 11px; }
    :host(.pill) .list, :host(.mini) .list { font-size: 0.8rem; }
    .grp { padding: 10px 10px 4px; font-family: var(--mono, 'JetBrains Mono', ui-monospace, monospace); font-size: 0.66rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); }
    .grp:first-child { padding-top: 4px; }
    .opt { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; border-radius: 10px; color: var(--text-2); cursor: pointer; user-select: none; }
    .opt.active { background: var(--accent-soft); color: var(--text); }
    .opt.sel { color: var(--accent); font-weight: 600; }
    .opt svg { flex-shrink: 0; }
    @media (prefers-reduced-motion: reduce) { .list, .chev, .trigger { transition: none; } }
  `,
})
export class Dropdown {
  readonly options = input.required<DropOption[]>();
  readonly value = model<string>('');
  readonly inputId = input<string | undefined>(undefined);
  readonly ariaLabel = input('');
  readonly placeholder = input('Select…');
  readonly disabled = input(false);
  readonly variant = input<'field' | 'pill' | 'mini'>('field');

  protected readonly listId = `dd-${++uid}`;
  protected readonly open = signal(false);
  protected readonly active = signal(-1);
  protected readonly current = computed(() => this.options().find(o => o.value === this.value()));

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private typed = '';
  private typedAt = 0;

  constructor() {
    const reposition = (e: Event) => { if (this.open() && !this.list().nativeElement.contains(e.target as Node)) this.place(); };
    const outside = (e: PointerEvent) => { if (this.open() && !this.trigger().nativeElement.contains(e.target as Node) && !this.list().nativeElement.contains(e.target as Node)) this.close(false); };
    addEventListener('scroll', reposition, true);
    addEventListener('resize', reposition);
    document.addEventListener('pointerdown', outside, true);
    inject(DestroyRef).onDestroy(() => {
      removeEventListener('scroll', reposition, true);
      removeEventListener('resize', reposition);
      document.removeEventListener('pointerdown', outside, true);
    });
  }

  focus() { this.trigger().nativeElement.focus(); }

  protected toggle() { this.open() ? this.close() : this.show(); }

  private show() {
    if (this.disabled() || this.open()) return;
    this.active.set(Math.max(0, this.options().findIndex(o => o.value === this.value())));
    const el = this.list().nativeElement;
    try { el.showPopover(); } catch { /* already open or unsupported */ }
    this.open.set(true);
    this.place();
    requestAnimationFrame(() => this.scrollActive());
  }

  private close(refocus = true) {
    if (!this.open()) return;
    try { this.list().nativeElement.hidePopover(); } catch { /* already closed */ }
    this.open.set(false);
    if (refocus) this.focus();
  }

  protected choose(i: number) {
    const o = this.options()[i];
    if (o) this.value.set(o.value);
    this.close();
  }

  /** Put the list under the trigger, or above it when there is no room below. */
  private place() {
    const r = this.trigger().nativeElement.getBoundingClientRect();
    const el = this.list().nativeElement;
    const gap = 6, edge = 8;
    const below = innerHeight - r.bottom - gap - edge, above = r.top - gap - edge;
    const up = below < 180 && above > below;
    const max = Math.max(120, Math.min(280, up ? above : below));
    const width = Math.max(r.width, this.variant() === 'field' ? 0 : 150);
    el.style.width = `${Math.min(width, innerWidth - edge * 2)}px`;
    el.style.maxHeight = `${max}px`;
    el.style.left = `${Math.min(Math.max(edge, r.left), innerWidth - edge - Math.min(width, innerWidth - edge * 2))}px`;
    el.style.top = up ? 'auto' : `${r.bottom + gap}px`;
    el.style.bottom = up ? `${innerHeight - r.top + gap}px` : 'auto';
    el.classList.toggle('up', up);
  }

  private scrollActive() {
    this.list().nativeElement.querySelector<HTMLElement>(`#${this.listId}-${this.active()}`)?.scrollIntoView({ block: 'nearest' });
  }

  private move(i: number) {
    const n = this.options().length;
    if (!n) return;
    this.active.set(Math.min(n - 1, Math.max(0, i)));
    this.scrollActive();
  }

  protected onBlur(e: FocusEvent) {
    if (!this.list().nativeElement.contains(e.relatedTarget as Node)) this.close(false);
  }

  protected onKey(e: KeyboardEvent) {
    const open = this.open();
    switch (e.key) {
      case 'ArrowDown': case 'ArrowUp':
        e.preventDefault();
        if (!open) { this.show(); return; }
        this.move(this.active() + (e.key === 'ArrowDown' ? 1 : -1));
        return;
      case 'Home': case 'End': case 'PageUp': case 'PageDown':
        if (!open) return;
        e.preventDefault();
        this.move(e.key === 'Home' ? 0 : e.key === 'End' ? this.options().length - 1 : this.active() + (e.key === 'PageDown' ? 8 : -8));
        return;
      case 'Enter': case ' ':
        e.preventDefault();
        if (open) this.choose(this.active()); else this.show();
        return;
      case 'Escape':
        if (open) { e.preventDefault(); e.stopPropagation(); this.close(); }
        return;
      case 'Tab':
        if (open) this.close(false);
        return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      this.typed = (now - this.typedAt > 700 ? '' : this.typed) + e.key.toLowerCase();
      this.typedAt = now;
      const opts = this.options(), start = this.typed.length === 1 ? this.active() + 1 : this.active();
      for (let k = 0; k < opts.length; k++) {
        const i = (start + k) % opts.length;
        if (opts[i].label.toLowerCase().startsWith(this.typed)) {
          if (open) this.move(i); else this.value.set(opts[i].value);
          break;
        }
      }
    }
  }
}
