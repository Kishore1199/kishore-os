import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AssistantBus } from '../core/assistant.bus';
import { Icon } from '../core/icon';
import { Dropdown } from '../core/dropdown';
import { OsService } from '../core/os.service';
import { VisitorMemory } from '../core/visitor-memory.service';
import { VoiceService } from '../core/voice.service';
import { DIALOG_STYLES } from '../layout/dialog-styles';
import { LabId } from './lab-ids';
import { splitEmail } from './lab-rules';
import { LabService } from './lab.service';
import { LabTool, Values } from './lab.types';
import { speakable } from './md';
import { MdView } from './md-view';
import { QuizView } from './quiz-view';
import { SavedItem, SavedStore } from './saved.store';
import { CodeRunView, GuestbookView, MeetingView, OfflineView, SemanticView, SqlRunView, TraceView } from './lab-views';
import { DailyView, DetectiveView, RaceView, RpsView, StudioView } from './game-views';
import { FeedbackService } from '../core/feedback.service';
import { SkillGraph } from './skill-graph';
import { Timeline } from './timeline';

/** Every AI Lab tool, inside a desktop window. Each window has its own LabService, so several can run at once. */
@Component({
  selector: 'app-lab',
  providers: [LabService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dropdown, CodeRunView, DailyView, DatePipe, DetectiveView, RaceView, RpsView, StudioView, GuestbookView, Icon, MdView, MeetingView, OfflineView, QuizView, SemanticView, SkillGraph, SqlRunView, Timeline, TraceView],
  template: `
    <dialog #dialog aria-labelledby="lab-title" [attr.data-tool]="tool().id" (close)="onClose()">
      <div class="box">
        <h2 id="lab-title" [class.sr]="tool().id === id()">{{ tool().title }}</h2>
        <div class="body">
          <p class="sum">{{ tool().intro }}</p>
          @switch (tool().view) {
            @case ('graph') { <app-skill-graph /> }
            @case ('timeline') { <app-timeline /> }
            @case ('quiz') { <app-quiz /> }
            @case ('trace') { <app-trace /> }
            @case ('semantic') { <app-semantic /> }
            @case ('sql-run') { <app-sql-run [seed]="seed()" /> }
            @case ('run-code') { <app-code-run [seed]="seed()" /> }
            @case ('meeting') { <app-meeting [seed]="seed()" (done)="dialog.close()" /> }
            @case ('offline') { <app-offline /> }
            @case ('guestbook') { <app-guestbook /> }
            @case ('detective') { <app-detective /> }
            @case ('rps') { <app-rps /> }
            @case ('race') { <app-race /> }
            @case ('studio') { <app-studio /> }
            @case ('daily') { <app-daily /> }
            @case ('saved') {
              @if (store.items().length) {
                @for (s of store.items(); track s.id) {
                  <details class="saved"><summary><b>{{ s.title }}</b> <small>{{ s.at | date: 'd MMM y, HH:mm' }}</small></summary><app-md [text]="s.text" /><button type="button" class="btn btn-ghost" (click)="remove(s)">Delete</button></details>
                }
              } @else { <p class="note">Nothing saved yet. Use Save on any result.</p> }
              @if (note()) { <p class="err" role="alert">{{ note() }}</p> }
            }
            @default {
              @if (lab.output(); as o) {
                <p class="note" role="status">{{ source() }}</p>
                @if (lab.steps().length) { <ul class="team mono">@for (s of lab.steps(); track $index) { <li [class]="s.state"><b>{{ s.agent }}</b> {{ s.note }}</li> }</ul> }
                <app-md [text]="o.text" />
                @if (o.links.length) { <div class="links">@for (l of o.links; track l.url) { <a [href]="l.url" target="_blank" rel="noopener"><app-icon name="external" [size]="12" /> {{ l.label }}</a> }</div> }
                @if (o.tool.caution && o.via !== 'rules') { <p class="note">{{ o.tool.caution }}</p> }
              } @else {
                @for (f of tool().fields; track f.key) {
                  <div class="field">
                    <label [for]="'lab-' + f.key">{{ f.label }}@if (f.optional) { <small> optional</small> }</label>
                    @switch (f.type) {
                      @case ('select') { <app-dropdown [inputId]="'lab-' + f.key" [disabled]="!!lab.busy()" [options]="opts(f.options)" [value]="values()[f.key] ?? ''" (valueChange)="set(f.key, $event)" /> }
                      @case ('area') { <textarea [id]="'lab-' + f.key" rows="5" [attr.maxlength]="f.max" [placeholder]="f.placeholder ?? ''" [disabled]="!!lab.busy()" [value]="values()[f.key] ?? ''" (input)="set(f.key, $any($event.target).value)"></textarea> }
                      @case ('file') { <input [id]="'lab-' + f.key" type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" [disabled]="!!lab.busy()" (change)="read($any($event.target).files?.[0])" /> }
                      @default { <input [id]="'lab-' + f.key" type="text" autocomplete="off" [attr.maxlength]="f.max" [placeholder]="f.placeholder ?? ''" [disabled]="!!lab.busy()" [value]="values()[f.key] ?? ''" (input)="set(f.key, $any($event.target).value)" (keydown.enter)="start()" /> }
                    }
                  </div>
                }
                @if (note()) { <p class="note" role="status">{{ note() }}</p> }
                @if (lab.error()) { <p class="err" role="alert">{{ lab.error() }}</p> }
                @if (lab.steps().length) { <ul class="team mono" aria-live="polite">@for (s of lab.steps(); track $index) { <li [class]="s.state"><b>{{ s.agent }}</b> {{ s.note }}</li> }</ul> }
                @if (lab.busy()) { <p class="stage mono" role="status"><i></i>{{ lab.busy() }}</p> }
                @else if (usesAi()) { <p class="note">{{ lab.cloud.canAsk() ? 'Sent to Google Gemini. ' + lab.cloud.remaining() + ' AI requests left today in this browser. Please don\\'t share confidential information.' : 'AI is resting, so you will get the version that needs no AI.' }}</p> }
              }
            }
          }
        </div>
        @if (!tool().view) {
          <footer>
            @if (lab.output(); as o) {
              <button type="button" class="btn btn-ghost" (click)="lab.reset(); note.set('')"><app-icon name="refresh" [size]="15" /> Again</button>
              <button type="button" class="btn btn-ghost" (click)="listen(o.text)"><app-icon [name]="voice.speaking() ? 'stop' : 'volume'" [size]="15" /> {{ voice.speaking() ? 'Stop' : 'Listen' }}</button>
              <button type="button" class="btn btn-ghost" (click)="copy(o.text)"><app-icon name="copy" [size]="15" /> {{ done() === 'copy' ? 'Copied' : 'Copy' }}</button>
              <button type="button" class="btn btn-ghost" (click)="download(o.text)"><app-icon name="download" [size]="15" /> Download</button>
              @if (memory.on()) { <button type="button" class="btn btn-ghost" [disabled]="done() === 'save'" (click)="save(o.text)"><app-icon name="check" [size]="15" /> {{ done() === 'save' ? 'Saved' : 'Save' }}</button> }
              @if (runnable(); as r) { <button type="button" class="btn btn-primary" (click)="bus.openLab(r.id, r.seed)"><app-icon name="play" [size]="15" /> Run it</button> }
              @if (o.via !== 'rules') {
                <button type="button" class="btn btn-ghost" [disabled]="done() === 'vote'" (click)="vote(true)" [title]="feedback.hint">{{ done() === 'vote' ? 'Thanks' : 'Good' }}</button>
                @if (done() !== 'vote') { <button type="button" class="btn btn-ghost" (click)="vote(false)" [title]="feedback.hint">Not good</button> }
              }
              @if (o.tool.email) { <button type="button" class="btn btn-primary" (click)="useEmail(o.text)"><app-icon name="mail" [size]="15" /> Use in contact form</button> }
              @if (o.via !== 'rules' && o.tool.id !== 'evaluate') { <button type="button" class="btn btn-ghost" (click)="check(o.text)"><app-icon name="search" [size]="15" /> Check answer</button> }
            } @else if (lab.busy()) {
              <button type="button" class="btn btn-ghost" (click)="lab.reset()"><app-icon name="stop" [size]="15" /> Stop</button>
            } @else {
              <button type="button" class="btn btn-primary" [disabled]="reading()" (click)="start()"><app-icon name="spark" [size]="15" /> {{ tool().cta ?? 'Generate' }}</button>
            }
          </footer>
        }
      </div>
    </dialog>
  `,
  styles: [DIALOG_STYLES, `
    :host { display: block; height: 100%; }
    dialog[open] { position: static; display: flex; width: 100%; height: 100%; max-height: none; margin: 0; border: 0; border-radius: 0; background: none; box-shadow: none; }
    .box { max-height: none; } h2 { padding: 14px 22px 0; } .sr { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .field { display: grid; gap: 6px; } .field small { color: var(--text-2); font-size: 0.76rem; }
    input { width: 100%; padding: 12px 14px; font: inherit; font-size: 0.88rem; color: var(--text); background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 14px; } input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    .links { display: flex; flex-wrap: wrap; gap: 6px; } .links a { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--accent); color: var(--accent); font-size: 0.76rem; font-weight: 600; text-decoration: none; }
    .team { display: grid; gap: 5px; font-size: 0.76rem; color: var(--text-2); padding-left: 12px; border-left: 2px solid var(--accent); } .team b { color: var(--text); } .team .run { opacity: 0.7; } .team .ok b { color: var(--good); } .team .skip b { color: var(--warn); }
    .saved { border: 1px solid var(--border); border-radius: 14px; padding: 12px 14px; } .saved summary { cursor: pointer; font-size: 0.9rem; } .saved small { color: var(--text-2); } .saved app-md { margin: 12px 0; } .saved .btn { padding: 7px 14px; font-size: 0.8rem; }
  `],
})
export class LabDialog implements OnInit, AfterViewInit, OnDestroy {
  readonly id = input.required<LabId>();
  readonly seed = input<Values>({});
  readonly close = output<void>();
  private os = inject(OsService);
  protected readonly lab = inject(LabService);
  protected readonly store = inject(SavedStore);
  protected readonly memory = inject(VisitorMemory);
  protected readonly voice = inject(VoiceService);
  protected readonly bus = inject(AssistantBus);
  protected readonly feedback = inject(FeedbackService);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  /** the checker can take over from another tool without closing */
  private readonly override = signal<LabId | null>(null);
  protected readonly tool = computed<LabTool>(() => this.lab.tool(this.override() ?? this.id()));
  /** SQL or JavaScript in the result that can be tried here */
  protected readonly runnable = computed<{ id: LabId; seed: Values } | null>(() => {
    const o = this.lab.output();
    if (!o || !['sql', 'angular', 'java', 'explain'].includes(o.tool.id)) return null;
    const m = o.text.match(/```(sql|javascript|js)\s*\n([\s\S]*?)```/i);
    if (!m) return null;
    const seed: Values = {};
    const sql = m[1].toLowerCase() === 'sql';
    seed[sql ? 'sql' : 'code'] = m[2].trim();
    return { id: sql ? 'sql-run' : 'run-code', seed };
  });
  protected readonly usesAi = computed(() => !!this.tool().ai || this.tool().id === 'team');
  protected readonly values = signal<Values>({});
  protected readonly note = signal('');
  protected readonly reading = signal(false);
  protected readonly done = signal('');
  protected readonly source = computed(() => ({ gemini: 'Written by Google Gemini.', device: 'Written by the AI on your device.', rules: this.usesAi() ? 'Made without AI.' : 'From this site, without AI.' })[this.lab.output()?.via ?? 'rules']);
  /** it started reading aloud, so it stops when the window closes */
  private reads = false;
  /** closed only for a moment, so the audit can see the page */
  private suspended = false;

  ngOnInit() {
    this.lab.reset();
    this.fill(this.seed());
    if (this.tool().view === 'saved') void this.store.load().catch(() => this.note.set('Saved results are not available in this browser.'));
  }

  ngAfterViewInit() {
    this.dialog().nativeElement.open = true; // show() would take the focus
    // windows that come back after a reload don't fight over the focus
    if (this.os.focused() === `tool:${this.id()}`) this.dialog().nativeElement.querySelector<HTMLElement>('textarea, input, [role=combobox]')?.focus({ preventScroll: true });
  }

  ngOnDestroy() {
    this.lab.reset();
    if (this.reads && this.voice.speaking()) this.voice.stop();
  }

  protected onClose() {
    if (!this.suspended) this.close.emit();
  }

  private fill(seed: Values) {
    const v: Values = {};
    for (const f of this.tool().fields) v[f.key] = seed[f.key] ?? (f.type === 'select' ? f.options![0] : '');
    this.values.set(v);
  }

  private optCache = new Map<readonly string[], { value: string; label: string }[]>();
  protected opts(list: readonly string[] | undefined) {
    if (!list) return [];
    let v = this.optCache.get(list);
    if (!v) this.optCache.set(list, (v = list.map(o => ({ value: o, label: o }))));
    return v;
  }

  protected set(key: string, value: string) {
    this.values.update(v => ({ ...v, [key]: value }));
  }

  protected async start() {
    if (this.lab.busy() || this.reading()) return;
    this.done.set('');
    const { id } = this.tool();
    if (id === 'accessibility') return this.audit();
    if (id === 'navigate') return this.navigate();
    await this.lab.run(this.tool(), this.values());
  }

  private async navigate() {
    const command = this.values()['ask'];
    const { planRoute } = await import('./navigate');
    if (!planRoute(command).length) { this.note.set('I did not recognise a place in that. Try "projects", "skills", "the EMR project" or "contact".'); return; }
    this.dialog().nativeElement.close();
    void this.lab.navigate(command);
  }

  private async audit() {
    const el = this.dialog().nativeElement;
    const tool = this.tool();
    this.bus.notify('Checking the page…');
    this.suspended = true;
    // the close event can arrive late: wait for it, or it would close the tool after the audit
    const closed = new Promise(r => el.addEventListener('close', r, { once: true }));
    el.close();
    await closed;
    this.suspended = false;
    await new Promise(r => setTimeout(r, 250));
    try {
      const { auditPage } = await import('./a11y-audit');
      this.lab.show(tool, await auditPage());
    } catch (e) {
      console.warn('[lab] audit failed', e);
      this.note.set('The audit could not run in this browser.');
    }
    if (el.isConnected) el.open = true;
  }

  protected async read(file?: File) {
    if (!file) return;
    this.reading.set(true);
    this.note.set('Reading the file…');
    try {
      const { fileText } = await import('./pdf-text');
      const text = await fileText(file);
      this.set('ask', text);
      this.note.set(`Read ${text.split(/\s+/).length} words from ${file.name}. Check the text below before you continue.`);
    } catch (e) {
      console.warn('[lab] file not read', e);
      const own = e instanceof Error && /^(That file|Please choose|No text)/.test(e.message);
      this.note.set(own ? (e as Error).message : 'That file could not be read. You can paste the text instead.');
    }
    this.reading.set(false);
  }

  protected listen(text: string) {
    if (this.voice.speaking()) this.voice.stop();
    else if ((this.reads = true)) void this.voice.say(speakable(text) || 'There is nothing to read aloud here.');
  }

  protected async copy(text: string) {
    try { await navigator.clipboard.writeText(text); this.done.set('copy'); } catch { this.bus.notify('The browser blocked copying'); }
  }

  protected download(text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.tool().id}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  protected async save(text: string) {
    try { await this.store.add({ tool: this.tool().id, title: this.tool().title, text, at: Date.now() }); this.done.set('save'); }
    catch { this.bus.notify('This browser could not save it'); }
  }

  protected async remove(s: SavedItem) {
    await this.store.remove(s.id!).catch(() => this.note.set('It could not be deleted.'));
  }

  protected async vote(up: boolean) {
    const o = this.lab.output();
    if (!o) return;
    const ok = await this.feedback.vote(up, o.tool.id, ['resume', 'cover-letter', 'review', 'debug'].includes(o.tool.id) ? '(not shared)' : Object.values(o.values).filter(Boolean).join(' | '), ['resume', 'cover-letter', 'review', 'debug'].includes(o.tool.id) ? '(not shared)' : o.text);
    if (ok) this.done.set('vote'); else this.bus.notify('Your rating could not be sent');
  }

  protected useEmail(text: string) {
    const { subject, message } = splitEmail(text);
    this.dialog().nativeElement.close();
    this.bus.fillDraft(subject, message);
  }

  protected check(text: string) {
    const v = this.lab.output()!.values;
    this.lab.reset();
    this.done.set('');
    this.override.set('evaluate');
    this.fill({ question: [v['project'], v['ask']].filter(Boolean).join(': ').slice(0, 400), ask: text.slice(0, 6000) });
  }
}
