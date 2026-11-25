import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { AssistantBus } from '../core/assistant.bus';
import { CloudService } from '../core/cloud.service';
import { Icon } from '../core/icon';
import { MAX_JOB_CHARS, STATUS_LABEL, Status, reportText } from '../core/job-match';
import { JobMatchService } from '../core/job-match.service';
import { VERDICT_LABEL } from '../core/hiring-panel';
import { PROFILE } from '../data/portfolio.data';
import { DIALOG_STYLES } from './dialog-styles';

const STATUSES: Status[] = ['proven', 'listed', 'partial', 'gap', 'ask'];

/** Paste a job description, get an honest requirement-by-requirement match. */
@Component({
  selector: 'app-job-match',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <dialog #dialog aria-labelledby="jm-title" (close)="close.emit()" (click)="$event.target === dialog && dialog.close()">
      <div class="box">
        <header>
          <h2 id="jm-title">Match a job description</h2>
          <button class="icon-btn" type="button" (click)="dialog.close()" aria-label="Close job matcher"><app-icon name="close" [size]="17" /></button>
        </header>
        <div class="body">
          @if (match.report(); as r) {
            <section aria-live="polite">
              @if (r.role) { <h3>{{ r.role }}</h3> }
              <p class="sum">{{ r.summary }}</p>
              <ul class="counts" aria-label="Result counts">
                @for (c of counts(); track c.status) { <li [class]="c.status"><b>{{ c.n }}</b> {{ label[c.status] }}</li> }
              </ul>
              @if (r.source === 'keywords') { <p class="note">Gemini wasn't available, so this is a simpler keyword match.</p> }
            </section>
            @if (match.panel(); as p) {
              <section class="panel" aria-live="polite" aria-label="Hiring panel">
                <div class="views">
                  @for (v of p.views; track v.name) {
                    <div>
                      <h4>{{ v.name }}</h4><span class="v" [class]="v.verdict">{{ verdict[v.verdict] }}</span>
                      <ul>@for (pt of v.points; track $index) { <li>{{ pt.text }}<small>{{ pt.row }}</small></li> }</ul>
                    </div>
                  }
                </div>
                <p class="sum"><b>Consensus:</b> {{ p.consensus }}</p>
                @if (p.questions.length) { <div class="sum"><b>Ask in the interview</b><ol>@for (q of p.questions; track $index) { <li>{{ q }}</li> }</ol></div> }
                <p class="note">{{ p.source === 'ai' ? 'Simulated AI opinions based only on the rows below. Not a hiring decision.' : "AI wasn't available, so this panel uses simple rules. Not a hiring decision." }}</p>
              </section>
            } @else if (match.panelBusy()) { <p class="stage mono" role="status"><i></i>The panel is discussing…</p> }
            @else { <button type="button" class="btn btn-ghost ask-panel" (click)="match.askPanel()"><app-icon name="network" [size]="15" /> Ask the hiring panel</button> }
            <ul class="rows">
              @for (row of r.rows; track $index) {
                <li>
                  <span class="tag" [class]="row.status"><app-icon [name]="icon[row.status]" [size]="12" />{{ label[row.status] }}</span>
                  <div>
                    <b>{{ row.label }}</b>@if (!row.must) { <small> nice to have</small> }
                    <p>{{ row.detail }}</p>
                    @if (row.projects.length) {
                      <div class="chips">@for (p of row.projects.slice(0, 3); track p) { <button type="button" (click)="show(p)"><app-icon name="layout" [size]="11" /> {{ p }}</button> }</div>
                    }
                  </div>
                </li>
              }
            </ul>
          } @else {
            <label for="jm-text">Paste the role's requirements. Each one is checked against the skills, projects and jobs on this site, gaps included.</label>
            <textarea id="jm-text" #text [value]="seed()" [attr.maxlength]="max" [disabled]="!!match.stage()" placeholder="We are looking for a Java developer with Spring Boot, Angular…"></textarea>
            @if (match.error()) { <p class="err" role="alert">{{ match.error() }}</p> }
            @if (match.stage()) { <p class="stage mono" role="status"><i></i>{{ match.stage() }}</p> }
            @else if (cloud.enabled) { <p class="note">The text is sent to Google Gemini. Please don't paste confidential information.</p> }
          }
        </div>
        <footer>
          @if (match.report()) {
            <button type="button" class="btn btn-ghost" (click)="match.reset()"><app-icon name="refresh" [size]="15" /> Another job</button>
            <button type="button" class="btn btn-ghost" (click)="copy()"><app-icon [name]="copied() ? 'check' : 'copy'" [size]="15" /> {{ copied() ? 'Copied' : 'Copy' }}</button>
            <a class="btn btn-primary" [href]="mailto()"><app-icon name="mail" [size]="15" /> Email Kishore</a>
          } @else if (match.stage()) {
            <button type="button" class="btn btn-ghost" (click)="match.reset()"><app-icon name="stop" [size]="15" /> Stop</button>
          } @else {
            <button type="button" class="btn btn-primary" (click)="start()"><app-icon name="search" [size]="15" /> Check the match</button>
          }
        </footer>
      </div>
    </dialog>
  `,
  styles: [DIALOG_STYLES, `
    textarea { height: min(300px, 40dvh); }
    .proven { --c: var(--good); } .listed { --c: var(--info); } .partial { --c: var(--warn); } .gap { --c: var(--bad); } .ask { --c: var(--text-2); }
    .counts { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 10px; font-size: 0.8rem; color: var(--text-2); }
    .counts b { color: var(--c); font-size: 1rem; }
    section .note { margin-top: 8px; }
    .rows li { display: grid; grid-template-columns: 112px 1fr; gap: 12px; padding: 11px 0; border-top: 1px solid var(--border); }
    .rows b { font-size: 0.9rem; overflow-wrap: anywhere; }
    .rows small { font-size: 0.74rem; color: var(--text-2); }
    .rows p { font-size: 0.82rem; color: var(--text-2); margin-top: 2px; }
    .tag { display: inline-flex; align-items: center; gap: 5px; height: fit-content; width: fit-content; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--c); color: var(--c); font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
    .chips button { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border-strong); background: none; color: var(--text-2); cursor: pointer; font-size: 0.74rem; }
    .chips button:hover { color: var(--accent); border-color: var(--accent); }
    .ask-panel { justify-self: start; padding: 8px 14px; font-size: 0.82rem; }
    .panel { display: grid; gap: 12px; padding: 14px; border: 1px solid var(--border-strong); border-radius: 16px; }
    .views { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; }
    .views h4 { font-size: 0.86rem; } .views li { font-size: 0.8rem; color: var(--text-2); margin-top: 7px; } .views li small { display: block; color: var(--accent); }
    .v { font-size: 0.74rem; font-weight: 600; } .v.strong { color: var(--good); } .v.possible { color: var(--warn); } .v.weak { color: var(--bad); }
    .panel ol { margin: 4px 0 0; padding-left: 18px; font-size: 0.82rem; color: var(--text-2); }
    @media (max-width: 520px) { .rows li { grid-template-columns: 1fr; gap: 6px; } }
  `],
})
export class JobMatch implements AfterViewInit, OnDestroy {
  readonly seed = input('');
  readonly close = output<void>();
  protected readonly match = inject(JobMatchService);
  protected readonly cloud = inject(CloudService);
  private bus = inject(AssistantBus);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private text = viewChild<ElementRef<HTMLTextAreaElement>>('text');

  protected readonly max = MAX_JOB_CHARS;
  protected readonly label = STATUS_LABEL;
  protected readonly verdict = VERDICT_LABEL;
  protected readonly icon: Record<Status, string> = { proven: 'check', listed: 'list-check', partial: 'pause', gap: 'close', ask: 'mail' };
  protected readonly copied = signal(false);
  protected readonly counts = computed(() => {
    const rows = this.match.report()?.rows ?? [];
    return STATUSES.map(status => ({ status, n: rows.filter(r => r.status === status).length })).filter(c => c.n);
  });
  protected readonly mailto = computed(() => {
    const r = this.match.report();
    if (!r) return '';
    return `mailto:${PROFILE.email}?subject=${encodeURIComponent(r.role ? `Role: ${r.role}` : 'A role for you')}&body=${encodeURIComponent(`Hi Kishore,\n\nI matched a role on your portfolio. ${r.summary}\n`)}`;
  });

  constructor() {
    this.match.reset();
  }

  ngAfterViewInit() {
    document.documentElement.style.overflow = 'hidden';
    this.dialog().nativeElement.showModal();
    this.text()?.nativeElement.focus();
  }

  ngOnDestroy() {
    document.documentElement.style.overflow = '';
    this.match.reset();
  }

  protected start() {
    this.copied.set(false);
    void this.match.run(this.text()?.nativeElement.value ?? '');
  }

  protected show(title: string) {
    this.dialog().nativeElement.close();
    document.documentElement.style.overflow = '';
    this.bus.showProject(title);
    void this.bus.go('projects');
  }

  protected async copy() {
    const r = this.match.report();
    if (!r) return;
    try { await navigator.clipboard.writeText(reportText(r)); this.copied.set(true); } catch { this.copied.set(false); }
  }
}
