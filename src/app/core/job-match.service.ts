import { Injectable, inject, signal } from '@angular/core';
import { CloudService } from './cloud.service';
import { PANEL_SCHEMA, PANEL_SYSTEM, Panel, panelPrompt, parsePanel, rulePanel } from './hiring-panel';
import { StructuredAi } from './structured-ai.service';
import { JOB_SCHEMA, JOB_SYSTEM, MAX_JOB_CHARS, MIN_JOB_CHARS, MatchReport, Requirement, buildReport, parseRequirements, readKeywords } from './job-match';

/** Runs one job match: at most one Gemini request, then everything else is decided in the browser. */
@Injectable({ providedIn: 'root' })
export class JobMatchService {
  private cloud = inject(CloudService);
  private ai = inject(StructuredAi);
  /** what is happening right now; empty when idle */
  readonly stage = signal('');
  readonly report = signal<MatchReport | null>(null);
  readonly error = signal('');
  readonly panel = signal<Panel | null>(null);
  readonly panelBusy = signal(false);
  private ctrl?: AbortController;
  /** the same text is never sent twice */
  private cache = new Map<string, MatchReport>();
  private panels = new WeakMap<MatchReport, Panel>();

  async run(raw: string) {
    this.reset();
    const job = raw.trim().slice(0, MAX_JOB_CHARS);
    if (job.length < MIN_JOB_CHARS) { this.error.set('Please paste a bit more of the job description.'); return; }
    const cached = this.cache.get(job);
    const ctrl = this.ctrl = new AbortController();
    if (cached) { this.report.set(cached); return; }

    let read: { role: string; requirements: Requirement[] } | null = null;
    this.stage.set('Reading the job description…');
    const reply = await this.ai.json(JOB_SYSTEM, JOB_SCHEMA, `<job_description>\n${job}\n</job_description>`, ctrl.signal);
    if (ctrl.signal.aborted) return;
    if (reply) read = parseRequirements(reply, job);
    const ai = !!read?.requirements.length;
    const report = buildReport(ai ? read! : readKeywords(job), ai ? 'ai' : 'keywords');
    this.stage.set('');
    if (!report.rows.length) { this.error.set('No requirements found in that text. Is it a job description?'); return; }
    if (ai) {
      this.cache.set(job, report);
      this.cloud.remember(`I matched Kishore against a job description${report.role ? ` for ${report.role}` : ''}.`, report.summary); // so follow-up questions make sense
    }
    this.report.set(report);
  }

  /** Three AI reviewers in one request, arguing only from the finished match. */
  async askPanel() {
    const report = this.report();
    if (!report || this.panelBusy()) return;
    const ctrl = this.ctrl ??= new AbortController();
    let panel = this.panels.get(report) ?? null;
    if (!panel) {
      this.panelBusy.set(true);
      panel = parsePanel(await this.ai.json(PANEL_SYSTEM, PANEL_SCHEMA, panelPrompt(report), ctrl.signal), report);
      if (ctrl.signal.aborted) return;
      this.panelBusy.set(false);
      if (panel) this.panels.set(report, panel);
    }
    this.panel.set(panel ?? rulePanel(report));
  }

  /** Stop and clear the last result. */
  reset() {
    this.ctrl?.abort();
    this.ctrl = undefined;
    this.panel.set(null);
    this.panelBusy.set(false);
    this.stage.set('');
    this.error.set('');
    this.report.set(null);
  }
}
