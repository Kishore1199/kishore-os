import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AssistantBus } from '../core/assistant.bus';
import { CloudService, GuestNote } from '../core/cloud.service';
import { FeedbackService } from '../core/feedback.service';
import { NoteHit, NotesService } from '../core/notes.service';
import { OfflineService } from '../core/offline.service';
import { TraceStore } from '../core/trace.store';
import { Meeting, ics, meetingMail, parseMeeting, when } from './meeting';
import { RunResult, SAMPLE_SQL, SqlRun, runJavaScript, runSql } from './sandbox';
import { Values } from './lab.types';

const SHARED = `
    :host { display: grid; gap: 14px; min-width: 0; } p, label { font-size: 0.86rem; color: var(--text-2); } .err { color: var(--bad, #ef4444); }
    textarea, input { width: 100%; padding: 12px 14px; font: inherit; font-size: 0.88rem; color: var(--text); background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 14px; } textarea.code { font: 0.8rem/1.55 'JetBrains Mono', monospace; resize: vertical; }
    textarea:focus, input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; } .btn { padding: 9px 16px; font-size: 0.84rem; } a { color: var(--accent); font-size: 0.84rem; }
    pre { margin: 0; padding: 14px; overflow: auto; max-height: 320px; border: 1px solid var(--border); border-radius: 14px; background: var(--bg-2); color: var(--text); font: 0.78rem/1.55 'JetBrains Mono', monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    .scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 14px; } table { width: 100%; border-collapse: collapse; font-size: 0.8rem; } th, td { padding: 8px 11px; text-align: left; border-bottom: 1px solid var(--border); color: var(--text-2); vertical-align: top; } th { color: var(--text); }
    summary { cursor: pointer; font-size: 0.88rem; } ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; } .card { padding: 12px 14px; border: 1px solid var(--border); border-radius: 14px; font-size: 0.86rem; color: var(--text-2); overflow-wrap: anywhere; } .card b { color: var(--text); }
    small { font-size: 0.76rem; color: var(--text-2); }`;

@Component({
  selector: 'app-trace', changeDetection: ChangeDetectionStrategy.OnPush, imports: [DatePipe],
  template: `
    @for (r of store.runs(); track r.id) {
      <details class="card" [open]="$first"><summary><b>{{ r.title }}</b><br><small>{{ r.at | date: 'HH:mm:ss' }} · {{ r.steps.length }} steps · {{ r.ms }} ms{{ r.done ? '' : ' · running' }}{{ tokens(r.steps) }}</small></summary>
        @if (r.steps.length) { <div class="scroll"><table><thead><tr><th scope="col">Step</th><th scope="col">Time</th><th scope="col">Tokens in / out</th><th scope="col">What happened</th></tr></thead>
          <tbody>@for (s of r.steps; track $index) { <tr><td>{{ s.kind === 'model' ? 'Gemini' : 'Tool' }}: {{ s.label }}{{ s.ok ? '' : ' (failed)' }}</td><td>{{ s.ms }} ms</td><td>{{ s.tokensIn ?? '–' }} / {{ s.tokensOut ?? '–' }}</td><td>{{ s.detail ?? '' }}</td></tr> }</tbody></table></div> }
      </details>
    } @empty { <p>Nothing yet. Ask ALPHA something or use an AI tool, then come back.</p> }
    @if (store.runs().length) { <div class="row"><button type="button" class="btn btn-ghost" (click)="store.clear()">Clear</button></div> }
    @if (votes.length) { <details class="card"><summary><b>Your ratings on this device</b> <small>{{ votes.length }}</small></summary><ul>@for (v of votes; track v.at) { <li>{{ v.up ? 'Good' : 'Not good' }}: {{ v.question }}</li> }</ul></details> }
    <p><small>Kept in memory only. Closing the page clears it.</small></p>`,
  styles: [SHARED],
})
export class TraceView {
  protected readonly store = inject(TraceStore);
  protected readonly votes = inject(FeedbackService).mine();
  protected tokens(steps: { tokensIn?: number; tokensOut?: number }[]) { const n = steps.reduce((s, x) => s + (x.tokensIn ?? 0) + (x.tokensOut ?? 0), 0); return n ? ` · ${n} tokens` : ''; }
}

@Component({
  selector: 'app-semantic', changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!notes.semanticReady()) {
      <p>Finds notes by meaning, so you don't need the exact words. It downloads a 2 MB model once and then runs in your browser.</p>
      <div class="row"><button type="button" class="btn btn-primary" [disabled]="busy()" (click)="load()">{{ busy() ? 'Loading…' : 'Turn it on' }}</button></div>
    } @else {
      <label for="sm">What do you want to know?</label>
      <input id="sm" #q type="search" placeholder="make a slow database query faster" (keydown.enter)="find(q.value)" />
      <div class="row"><button type="button" class="btn btn-primary" (click)="find(q.value)">Search</button><small>ALPHA's note answers use it too.</small></div>
      <ul aria-live="polite">@for (h of hits(); track h.key + h.question) { <li class="card"><b>{{ h.question }}</b><br>{{ preview(h) }}<br><a [href]="h.url" target="_blank" rel="noopener">{{ h.chapter }}</a> <small>{{ (h.score * 100).toFixed(0) }}% close</small></li> }</ul>
      @if (searched() && !hits().length) { <p>Nothing close enough. Try different words.</p> }
    }
    @if (error()) { <p class="err" role="alert">{{ error() }}</p> }`,
  styles: [SHARED],
})
export class SemanticView {
  protected readonly notes = inject(NotesService);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly hits = signal<(NoteHit & { answer: string })[]>([]);
  protected readonly searched = signal(false);
  protected preview = (h: { answer: string }) => (h.answer.length > 220 ? h.answer.slice(0, 220) + '…' : h.answer);

  protected async load() {
    this.busy.set(true); this.error.set('');
    try { await this.notes.enableSemantic(); } catch { this.error.set('It could not be downloaded. Please check your connection.'); }
    this.busy.set(false);
  }
  protected async find(q: string) {
    if (q.trim().length < 2) return;
    this.error.set('');
    try { this.hits.set(await this.notes.byMeaning(q, 6)); this.searched.set(true); } catch { this.error.set('The notes could not be loaded.'); }
  }
}

@Component({
  selector: 'app-sql-run', changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>A sample SQLite database in your browser. Every run starts fresh, so you can't break anything. MySQL or Oracle syntax may differ.</p>
    <details class="card"><summary>Sample tables: department, employee, customer, orders</summary><pre tabindex="0">{{ sample }}</pre></details>
    <label for="sq">SQL</label><textarea id="sq" #box class="code" rows="6" spellcheck="false" [value]="start()"></textarea>
    <div class="row"><button type="button" class="btn btn-primary" [disabled]="busy()" (click)="run(box.value)">{{ busy() ? 'Running…' : 'Run' }}</button>@if (result(); as r) { <small>{{ r.ms }} ms</small> }</div>
    <div aria-live="polite">
      @if (result(); as r) {
        @if (r.ok) {
          @for (t of r.results; track $index) { <div class="scroll" tabindex="0" role="region" aria-label="Query result"><table><thead><tr>@for (c of t.columns; track $index) { <th scope="col">{{ c }}</th> }</tr></thead><tbody>@for (row of t.rows; track $index) { <tr>@for (v of row; track $index) { <td>{{ v ?? 'NULL' }}</td> }</tr> } @empty { <tr><td [attr.colspan]="t.columns.length">No rows</td></tr> }</tbody></table></div>@if (t.more) { <small>and {{ t.more }}{{ t.more >= 10000 ? '+' : '' }} more rows</small> } }
          @if (!r.results.length) { <p>Done. {{ r.changed }} row{{ r.changed === 1 ? '' : 's' }} changed.</p> }
        } @else { <p class="err">{{ r.error }}</p> }
      }
    </div>`,
  styles: [SHARED],
})
export class SqlRunView {
  readonly seed = input<Values>({});
  protected readonly start = computed(() => this.seed()['sql'] || 'SELECT d.name, COUNT(*) AS people, AVG(e.salary) AS avg_salary\nFROM employee e JOIN department d ON d.id = e.department_id\nGROUP BY d.name ORDER BY avg_salary DESC;');
  protected readonly sample = SAMPLE_SQL;
  protected readonly busy = signal(false);
  protected readonly result = signal<SqlRun | null>(null);
  protected async run(sql: string) { this.busy.set(true); this.result.set(await runSql(sql, SAMPLE_SQL)); this.busy.set(false); }
}

@Component({
  selector: 'app-code-run', changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>Runs JavaScript in a sealed sandbox: no network, no access to this page, stopped after 4 seconds. Java can't run here.</p>
    <label for="cr">JavaScript</label><textarea id="cr" #box class="code" rows="9" spellcheck="false" [value]="start()"></textarea>
    <div class="row"><button type="button" class="btn btn-primary" [disabled]="busy()" (click)="run(box.value)">{{ busy() ? 'Running…' : 'Run' }}</button>@if (result(); as r) { <small>{{ r.ok ? 'Finished' : 'Failed' }} in {{ r.ms }} ms</small> }</div>
    <div aria-live="polite">@if (result(); as r) { <pre tabindex="0">{{ r.out }}</pre> }</div>`,
  styles: [SHARED],
})
export class CodeRunView {
  readonly seed = input<Values>({});
  protected readonly start = computed(() => this.seed()['code'] || "const words = 'spring angular java spring'.split(' ');\nconst count = Object.groupBy(words, w => w);\nconsole.log(Object.entries(count).map(([w, xs]) => `${w}: ${xs.length}`));");
  protected readonly busy = signal(false);
  protected readonly result = signal<RunResult | null>(null);
  protected async run(code: string) { this.busy.set(true); this.result.set(await runJavaScript(code)); this.busy.set(false); }
}

@Component({
  selector: 'app-meeting', changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label for="mw">When?</label><input id="mw" #w type="text" maxlength="120" placeholder="Tuesday 4 pm for 30 minutes" [value]="seed()['when'] ?? ''" (keydown.enter)="plan(w.value, t.value)" />
    <label for="mt">About</label><input id="mt" #t type="text" maxlength="100" placeholder="A Java full-stack role" [value]="seed()['topic'] ?? ''" (keydown.enter)="plan(w.value, t.value)" />
    <div class="row"><button type="button" class="btn btn-primary" (click)="plan(w.value, t.value)">Check the time</button><small>Your time zone: {{ zone }}</small></div>
    @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
    @if (meeting(); as m) {
      <div class="card" role="status"><b>{{ m.topic || 'Call with Kishore V' }}</b><br>For you: {{ mine() }}<br>For Kishore: {{ his() }}<br>{{ m.minutes }} minutes</div>
      <p>Nothing is booked yet. Choose what to do with it.</p>
      <div class="row"><button type="button" class="btn btn-ghost" (click)="save(m)">Download calendar file</button><button type="button" class="btn btn-primary" (click)="mail(m)">Put in contact form</button></div>
    }`,
  styles: [SHARED],
})
export class MeetingView implements OnInit {
  readonly seed = input<Values>({});
  readonly done = output<void>();
  private bus = inject(AssistantBus);
  protected readonly zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  protected readonly meeting = signal<Meeting | null>(null);
  protected readonly error = signal('');
  protected readonly mine = computed(() => (this.meeting() ? when(this.meeting()!.start, this.zone) : ''));
  protected readonly his = computed(() => (this.meeting() ? when(this.meeting()!.start, 'Asia/Kolkata') : ''));

  ngOnInit() { if (this.seed()['when']) this.plan(this.seed()['when'], this.seed()['topic'] ?? ''); }

  protected plan(text: string, topic: string) {
    const r = parseMeeting(text);
    this.error.set(typeof r === 'string' ? r : '');
    this.meeting.set(typeof r === 'string' ? null : { ...r, topic: topic.trim().replace(/\s+/g, ' ') });
  }
  protected save(m: Meeting) {
    const url = URL.createObjectURL(new Blob([ics(m, `${crypto.randomUUID()}@kishore-os.web.app`)], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'meeting.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  protected mail(m: Meeting) {
    const { subject, message } = meetingMail(m, this.zone);
    this.done.emit();
    document.documentElement.style.overflow = '';
    this.bus.fillDraft(subject, message);
  }
}

@Component({
  selector: 'app-offline', changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>{{ o.supported ? (o.active() ? 'This site is saved for offline use as you browse.' : 'Offline support starts about half a minute after the page loads. It is on in the published site only.') : 'This browser does not support offline use.' }}</p>
    <div class="row">
      @if (o.canInstall()) { <button type="button" class="btn btn-primary" (click)="o.install()">Install the app</button> }
      @if (o.active()) { <button type="button" class="btn btn-ghost" [disabled]="o.saving()" (click)="o.saveAll()">{{ o.saving() ? 'Saving ' + o.saved() + '%' : 'Save everything for offline (about 4 MB)' }}</button> }
    </div>
    @if (o.message()) { <p role="status">{{ o.message() }}</p> }
    <p><small>Offline you can use the notes search, quiz, interview with keyword scores, job matcher, comparison, skill graph, timeline, code runner and SQL playground. AI answers, GitHub and the guestbook need internet.</small></p>`,
  styles: [SHARED],
})
export class OfflineView { protected readonly o = inject(OfflineService); }

const COLORS = ['#fde68a', '#fbcfe8', '#bbf7d0', '#bae6fd', '#ddd6fe'];
@Component({
  selector: 'app-guestbook', changeDetection: ChangeDetectionStrategy.OnPush, imports: [DatePipe],
  template: `
    <p>Public notes, shared with Kishore.OS. Everyone can read them, and they can't be edited afterwards.</p>
    @if (cloud.enabled) {
      <label for="gn">Name</label><input id="gn" #n type="text" maxlength="40" autocomplete="nickname" />
      <label for="gm">Message</label><textarea id="gm" #m rows="3" maxlength="240"></textarea>
      <div class="row" role="group" aria-label="Note colour">@for (c of colors; track c) { <button type="button" class="dot" [style.background]="c" [attr.aria-pressed]="color() === c" [attr.aria-label]="'Colour ' + ($index + 1)" (click)="color.set(c)"></button> }
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="add(n, m)">{{ busy() ? 'Posting…' : 'Post publicly' }}</button></div>
    } @else { <p>The guestbook is not connected.</p> }
    @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
    <ul>@for (g of list(); track g.id) { <li class="note" [style.background]="g.color"><b>{{ g.name }}</b> @if (g.at) { <span>{{ g.at | date: 'd MMM y' }}</span> }<br>{{ g.message }}</li> } @empty { @if (!error()) { <li class="card">{{ loading() ? 'Loading…' : 'No notes yet. Be the first.' }}</li> } }</ul>`,
  styles: [SHARED, `.dot { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; } .dot[aria-pressed='true'] { border-color: var(--text); } .note { padding: 12px 14px; border-radius: 14px; color: #1c1917; font-size: 0.88rem; overflow-wrap: anywhere; } .note span { font-size: 0.76rem; }`],
})
export class GuestbookView implements OnInit, OnDestroy {
  protected readonly cloud = inject(CloudService);
  protected readonly colors = COLORS;
  protected readonly color = signal(COLORS[0]);
  protected readonly list = signal<GuestNote[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  private off?: () => void;
  private gone = false;

  async ngOnInit() {
    if (!this.cloud.enabled) { this.loading.set(false); return; }
    try {
      const off = await this.cloud.watchGuestbook(
        ns => { this.list.set(ns.map(n => ({ ...n, color: COLORS.includes(n.color) ? n.color : COLORS[0] }))); this.loading.set(false); },
        () => { this.error.set('The notes could not be loaded.'); this.loading.set(false); });
      if (this.gone) off(); else this.off = off;
    } catch { this.error.set('The notes could not be loaded.'); this.loading.set(false); }
  }
  ngOnDestroy() { this.gone = true; this.off?.(); }

  protected async add(n: HTMLInputElement, m: HTMLTextAreaElement) {
    const name = n.value.trim(), message = m.value.trim();
    if (name.length < 2 || message.length < 3) { this.error.set('Please add a name and a message.'); return; }
    let last = 0;
    try { last = Number(localStorage.getItem('kv-guest-at')) || 0; } catch { /* storage unavailable */ }
    if (Date.now() - last < 60_000) { this.error.set('Please wait a minute between notes.'); return; }
    this.busy.set(true); this.error.set('');
    try {
      await this.cloud.addNote(name, message, this.color());
      try { localStorage.setItem('kv-guest-at', String(Date.now())); } catch { /* storage unavailable */ }
      m.value = '';
    } catch { this.error.set('Your note could not be posted.'); }
    this.busy.set(false);
  }
}
