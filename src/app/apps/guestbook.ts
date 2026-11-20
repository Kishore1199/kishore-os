import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CloudService, GuestNote } from '../core/cloud.service';
import { Icon } from '../core/icon';
import { OsService } from '../core/os.service';

const COLORS = ['#fde68a', '#fbcfe8', '#bbf7d0', '#bae6fd', '#ddd6fe'];
const COOLDOWN_KEY = 'kv-guest-last';

/** A shared sticky-note wall stored in Firestore, updated live for every visitor. */
@Component({
  selector: 'app-guestbook',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="wrap">
      <form class="compose" (submit)="$event.preventDefault(); post()">
        <div class="head">
          <p class="kicker">Guestbook</p>
          <h2>Leave a note on the wall</h2>
        </div>
        <input class="field" [value]="name()" (input)="name.set($any($event.target).value)" maxlength="40" placeholder="Your name" aria-label="Your name" autocomplete="name" />
        <textarea class="field" [value]="msg()" (input)="msg.set($any($event.target).value)" maxlength="240" rows="3" placeholder="Say hi, share feedback, or a job lead 🙂" aria-label="Message"></textarea>
        <div class="row">
          <div class="colors" role="radiogroup" aria-label="Note colour">
            @for (c of colors; track c) { <button type="button" role="radio" [attr.aria-checked]="color() === c" [style.background]="c" [class.on]="color() === c" (click)="color.set(c)" [attr.aria-label]="'Colour ' + c"></button> }
          </div>
          <span class="count mono">{{ msg().length }}/240</span>
          <button type="submit" class="btn hot" [disabled]="busy() || !cloud.enabled"><app-icon name="send" [size]="14" /> {{ busy() ? 'Pinning…' : 'Pin it' }}</button>
        </div>
        @if (err()) { <p class="err">{{ err() }}</p> }
      </form>

      @if (!cloud.enabled) {
        <div class="off">
          <app-icon name="cloud" [size]="22" />
          <p><b>Guestbook isn't connected yet.</b> Add your Firebase settings in <code>src/app/core/firebase.config.ts</code> (see <code>FIREBASE_SETUP.md</code>) and notes will appear here live.</p>
        </div>
      } @else {
        <div class="wall">
          @for (n of notes(); track n.id; let i = $index) {
            <article class="note" [style.background]="n.color" [style.--r]="((i * 37) % 7) - 3 + 'deg'">
              <p>{{ n.message }}</p>
              <footer><b>— {{ n.name }}</b>@if (n.at) { <small>{{ n.at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }}</small> }</footer>
            </article>
          } @empty { <p class="empty mono">{{ loading() ? 'Loading notes…' : 'No notes yet — be the first!' }}</p> }
        </div>
      }
    </div>
  `,
  styles: `
    .wrap { padding: 22px; display: grid; gap: 20px; }
    .compose { display: grid; gap: 10px; padding: 18px; border-radius: 18px; background: var(--glass-2); border: 1px solid var(--line); }
    h2 { font-size: 1.5rem; margin-top: 4px; }
    textarea { resize: vertical; }
    .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .colors { display: flex; gap: 6px; }
    .colors button { width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
    .colors button.on { border-color: var(--ink); transform: scale(1.15); }
    .count { margin-left: auto; font-size: 0.72rem; color: var(--ink-3); }
    .btn[disabled] { opacity: 0.55; cursor: not-allowed; }
    .err { color: #fb7185; font-size: 0.84rem; }
    .off { display: flex; gap: 12px; align-items: flex-start; padding: 16px; border-radius: 16px; border: 1px dashed var(--line-2); color: var(--ink-2); }
    .off code { font-size: 0.8rem; }
    .wall { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .note { padding: 16px 14px 12px; min-height: 130px; display: flex; flex-direction: column; color: #1f1b2e; border-radius: 4px 4px 14px 4px;
      transform: rotate(var(--r)); box-shadow: 0 14px 22px -14px rgba(0,0,0,0.6); animation: fade-up 0.35s both; transition: transform 0.2s; }
    .note:hover { transform: rotate(0) scale(1.04); z-index: 1; }
    .note p { flex: 1; font-size: 0.92rem; line-height: 1.45; word-break: break-word; }
    .note footer { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; margin-top: 10px; font-size: 0.78rem; }
    .note small { opacity: 0.6; }
    .empty { color: var(--ink-3); }
  `,
})
export class Guestbook implements OnInit, OnDestroy {
  protected readonly cloud = inject(CloudService);
  private os = inject(OsService);
  protected readonly colors = COLORS;
  protected readonly notes = signal<GuestNote[]>([]);
  protected readonly loading = signal(true);
  protected readonly name = signal('');
  protected readonly msg = signal('');
  protected readonly color = signal(COLORS[0]);
  protected readonly busy = signal(false);
  protected readonly err = signal('');
  private unsub?: () => void;
  private dead = false;

  async ngOnInit() {
    if (!this.cloud.enabled) return;
    try {
      const u = await this.cloud.watchGuestbook(n => { this.notes.set(n); this.loading.set(false); }, m => { this.err.set('Could not load notes: ' + m); this.loading.set(false); });
      if (this.dead) u(); else this.unsub = u;
    } catch (e) {
      this.err.set('Could not connect to Firebase.');
      this.loading.set(false);
    }
  }

  protected async post() {
    const name = this.name().trim(), message = this.msg().trim();
    if (name.length < 2 || message.length < 3) { this.err.set('Please add your name and a short message.'); return; }
    let last = 0;
    try { last = Number(localStorage.getItem(COOLDOWN_KEY)) || 0; } catch { /* ignore */ }
    if (Date.now() - last < 60_000) { this.err.set('One note per minute, please 🙂'); return; }
    this.busy.set(true);
    this.err.set('');
    try {
      await this.cloud.addNote(name.slice(0, 40), message.slice(0, 240), this.color());
      try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch { /* ignore */ }
      this.msg.set('');
      this.os.react('party', 2200);
      this.os.notify('Pinned to the wall — thank you!');
    } catch {
      this.err.set('Could not pin your note right now. Please try again later.');
    } finally {
      this.busy.set(false);
    }
  }

  ngOnDestroy() {
    this.dead = true;
    this.unsub?.();
  }
}
