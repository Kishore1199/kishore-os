import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Icon } from '../core/icon';
import { AppId, OsService, appDef } from '../core/os.service';
import { STUDY_GUIDES } from '../data/study.data';
import { MdView } from '../lab/md-view';
import { SavedItem, SavedStore } from '../lab/saved.store';

/** Results saved from the AI Lab, as files. They live in this browser's IndexedDB only. */
@Component({
  selector: 'app-files',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, Icon, MdView],
  template: `
    @if (open(); as f) {
      <div class="bar">
        <button type="button" class="btn sm" (click)="close()"><app-icon class="flip" name="arrow-right" [size]="14" /> Files</button>
        @if (naming()) {
          <form (submit)="$event.preventDefault(); rename(f, nm.value)"><input #nm class="field" [value]="f.title" maxlength="80" aria-label="File name" (keydown.escape)="naming.set(false)" /><button type="submit" class="btn sm">Save name</button></form>
        } @else { <b>{{ f.title }}</b> }
        <button type="button" class="icon-btn" (click)="naming.set(!naming())" aria-label="Rename"><app-icon name="pen" [size]="15" /></button>
        <button type="button" class="icon-btn" (click)="copy(f)" aria-label="Copy the text"><app-icon name="copy" [size]="15" /></button>
        <button type="button" class="icon-btn" (click)="download(f)" aria-label="Download"><app-icon name="download" [size]="15" /></button>
        @if (asking()) { <button type="button" class="btn sm danger" (click)="remove(f)">Delete for good</button> }
        @else { <button type="button" class="icon-btn" (click)="asking.set(true)" aria-label="Delete"><app-icon name="trash" [size]="15" /></button> }
      </div>
      <article><app-md [text]="f.text" /></article>
    } @else {
      <div class="wrap">
        <label class="find"><app-icon name="search" [size]="14" /><input [value]="q()" (input)="q.set($any($event.target).value)" placeholder="Find a file" aria-label="Find a file" /></label>
        <h2>Documents</h2>
        <ul>
          <li><button type="button" (click)="os.open('resume')"><span class="ic r"><app-icon name="file" [size]="24" /></span><b>Resume.pdf</b><small>PDF</small></button></li>
          @for (g of guides; track g.key) { <li><a [href]="g.file" target="_blank" rel="noopener"><span class="ic g"><app-icon name="book-open" [size]="24" /></span><b>{{ g.short }} guide</b><small>opens in a new tab</small></a></li> }
        </ul>
        <h2>Saved from the AI Lab <small>{{ store.items().length }}</small></h2>
        <ul>
          @for (f of shown(); track f.id) {
            <li><button type="button" (click)="show(f)"><span class="ic"><app-icon [name]="icon(f)" [size]="24" /></span><b>{{ f.title }}</b><small>{{ f.at | date: 'd MMM, HH:mm' }}</small></button></li>
          } @empty {
            <li class="none">@if (error()) { {{ error() }} } @else if (q()) { Nothing matches “{{ q() }}”. } @else { Nothing saved yet. Run a tool and press Save. <button type="button" class="btn sm" (click)="os.open('ailab')">Open the AI Lab</button> }</li>
          }
        </ul>
        <p class="fine">Kept in this browser only. “Forget me” in the chat deletes them.</p>
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100%; }
    .bar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 14px; background: var(--solid); border-bottom: 1px solid var(--line); }
    .bar b, .bar form { flex: 1; min-width: 120px; } .bar b { overflow-wrap: anywhere; } .bar form { display: flex; gap: 8px; } .bar .field { padding: 7px 11px; }
    .sm { padding: 7px 13px; font-size: 0.82rem; } .danger { color: #fff; border-color: #b91c1c; background: #b91c1c; } .flip { transform: scaleX(-1); }
    article { padding: 18px 22px 30px; display: grid; gap: 12px; }
    .wrap { padding: 20px 22px; display: grid; gap: 14px; align-content: start; }
    .find { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 13px; border: 1px solid var(--line-2); color: var(--ink-2); } .find input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; color: var(--ink); } .find:focus-within { border-color: var(--accent); }
    h2 { font-size: 1.05rem; margin-top: 6px; } h2 small { color: var(--ink-2); font: 500 0.78rem var(--mono); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 10px; }
    li > button, li > a { width: 100%; height: 100%; display: grid; justify-items: center; align-content: start; gap: 7px; padding: 14px 8px; border: 1px solid transparent; border-radius: 16px; background: none; color: var(--ink); cursor: pointer; text-decoration: none; text-align: center; }
    li > button:not(.btn):hover, li > a:hover { background: var(--glass-2); border-color: var(--line-2); }
    li b { font-size: 0.84rem; line-height: 1.3; overflow-wrap: anywhere; } li small, .fine { color: var(--ink-2); font-size: 0.72rem; }
    .ic { width: 56px; height: 62px; display: grid; place-items: center; border-radius: 12px; color: #fff; background: linear-gradient(145deg, #0891b2, #155e75); } .ic.r { background: linear-gradient(145deg, #64748b, #334155); } .ic.g { background: linear-gradient(145deg, #a16207, #713f12); }
    .none { grid-column: 1 / -1; padding: 20px; border: 1px dashed var(--line-2); border-radius: 16px; color: var(--ink-2); font-size: 0.9rem; } .none .btn { margin-left: 8px; }
    @media (max-width: 760px) { .wrap, article { padding-bottom: 180px; } }
  `,
})
export class Files implements OnInit {
  protected readonly os = inject(OsService);
  protected readonly store = inject(SavedStore);
  protected readonly guides = STUDY_GUIDES;
  protected readonly q = signal('');
  protected readonly error = signal('');
  protected readonly naming = signal(false);
  protected readonly asking = signal(false);
  private readonly openId = signal<number | null>(null);
  protected readonly open = computed(() => this.store.items().find(f => f.id === this.openId()) ?? null);
  protected readonly shown = computed(() => { const q = this.q().trim().toLowerCase(); return this.store.items().filter(f => !q || `${f.title} ${f.text}`.toLowerCase().includes(q)); });

  ngOnInit() {
    void this.store.load().catch(() => this.error.set('Saved files are not available in this browser.'));
  }
  protected icon(f: SavedItem) {
    return appDef(f.tool === 'saved' ? ('files' as AppId) : `tool:${f.tool}`)?.icon ?? 'file';
  }
  protected show(f: SavedItem) {
    this.openId.set(f.id!);
    this.close(false);
  }
  protected close(list = true) {
    if (list) this.openId.set(null);
    this.naming.set(false);
    this.asking.set(false);
  }
  protected async rename(f: SavedItem, name: string) {
    const title = name.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (title) await this.store.rename(f.id!, title).catch(() => this.os.notify('It could not be renamed'));
    this.naming.set(false);
  }
  protected async remove(f: SavedItem) {
    try { await this.store.remove(f.id!); this.close(); } catch { this.os.notify('It could not be deleted'); }
  }
  protected copy(f: SavedItem) {
    void this.os.copy(f.text, 'Text');
  }
  protected download(f: SavedItem) {
    const url = URL.createObjectURL(new Blob([f.text], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${f.title.replace(/[^\w -]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'file'}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
