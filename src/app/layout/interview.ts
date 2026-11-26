import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, linkedSignal, output, signal, viewChild } from '@angular/core';
import { AssistantBus } from '../core/assistant.bus';
import { CloudService } from '../core/cloud.service';
import { Icon } from '../core/icon';
import { Dropdown } from '../core/dropdown';
import { InterviewService } from '../core/interview.service';
import { chapter } from '../core/notes.service';
import { VisitorMemory } from '../core/visitor-memory.service';
import { VoiceService } from '../core/voice.service';
import { DIALOG_STYLES } from './dialog-styles';

/** Five questions from the study notes, scored one at a time; weak chapters come back more often. */
@Component({
  selector: 'app-interview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dropdown, Icon],
  template: `
    <dialog #dialog aria-labelledby="iv-title" (close)="close.emit()" (click)="$event.target === dialog && dialog.close()">
      <div class="box">
        <header>
          <h2 id="iv-title">Mock interview @if (iv.rounds().length && iv.phase() !== 'done') { <small class="mono">{{ iv.rounds().length }}/{{ iv.total }}</small> }</h2>
          <button class="icon-btn" type="button" (click)="dialog.close()" aria-label="Close mock interview"><app-icon name="close" [size]="17" /></button>
        </header>
        <div class="body">
          @switch (iv.phase()) {
            @case ('setup') {
              <label for="iv-topic">Five questions from the study notes, scored as you go. A chapter you find hard comes back sooner.</label>
              <app-dropdown inputId="iv-topic" [options]="iv.choices()" [(value)]="topicValue" />
              @if (iv.error()) { <p class="err" role="alert">{{ iv.error() }}</p> }
              @if (cloud.enabled) { <p class="note">Answers are sent to Google Gemini for scoring. Without it, they get a rough keyword score.</p> }
              @if (memory.on()) { <p class="note">Your scores stay in this browser. "Forget me" in the chat deletes them.</p> }
            }
            @case ('loading') { <p class="stage mono" role="status"><i></i>Picking a question…</p> }
            @case ('done') {
              <section aria-live="polite">
                <h3>{{ scored().length ? 'Average ' + iv.average().toFixed(1) + ' out of 10' : 'Interview ended' }}</h3>
                @if (iv.error()) { <p class="err">{{ iv.error() }}</p> }
                <p class="sum">{{ scored().length ? 'Open a chapter to revise it. The lowest scores are first.' : 'No answers were scored.' }}</p>
              </section>
              <ul class="res">
                @for (r of scored(); track r.question) {
                  <li><b [class]="tone(r.grade!.score)">{{ r.grade!.score }}</b><span>{{ r.question }}</span><a [href]="url(r.key)" target="_blank" rel="noopener">{{ title(r.key) }}</a></li>
                }
              </ul>
            }
            @default {
              @if (iv.current(); as r) {
                <p class="tag mono">{{ title(r.key) }}</p>
                <h3 class="q">{{ r.question }}</h3>
                @if (r.grade; as g) {
                  <section aria-live="polite" class="grade">
                    <p class="score"><b [class]="tone(g.score)">{{ g.score }}</b> out of 10 @if (g.source === 'keywords') { <small>rough keyword estimate</small> }</p>
                    @for (x of g.good; track x) { <p class="pt"><app-icon name="check" [size]="13" class="good" /> {{ x }}</p> }
                    @for (x of g.missing; track x) { <p class="pt"><app-icon name="close" [size]="13" class="bad" /> {{ x }}</p> }
                    @if (g.tip) { <p class="sum">{{ g.tip }}</p> }
                  </section>
                  <details open><summary>Answer from the notes</summary><pre>{{ r.reference }}</pre><a [href]="url(r.key)" target="_blank" rel="noopener">Open the chapter</a></details>
                } @else {
                  <textarea #answer rows="6" maxlength="3000" [disabled]="iv.phase() === 'grading'" aria-label="Your answer" placeholder="Answer in your own words…"></textarea>
                  @if (iv.phase() === 'grading') { <p class="stage mono" role="status"><i></i>Scoring your answer…</p> }
                  @else if (voice.listening()) { <p class="stage mono" role="status"><i></i>{{ voice.interim() || 'Listening…' }}</p> }
                }
              }
            }
          }
        </div>
        <footer>
          @switch (iv.phase()) {
            @case ('setup') { <button type="button" class="btn btn-primary" (click)="begin()"><app-icon name="play" [size]="15" /> Start</button> }
            @case ('question') {
              @if (voice.canListen) { <button type="button" class="btn btn-ghost" (click)="dictate()"><app-icon [name]="voice.listening() ? 'stop' : 'mic'" [size]="15" /> {{ voice.listening() ? 'Stop' : 'Speak' }}</button> }
              <button type="button" class="btn btn-ghost" (click)="submit('')">Skip</button>
              <button type="button" class="btn btn-primary" (click)="submit()"><app-icon name="check" [size]="15" /> Check answer</button>
            }
            @case ('graded') { <button type="button" class="btn btn-primary" (click)="next()"><app-icon name="arrow-right" [size]="15" /> {{ iv.rounds().length >= iv.total ? 'See results' : 'Next question' }}</button> }
            @case ('done') { <button type="button" class="btn btn-primary" (click)="iv.stop()"><app-icon name="refresh" [size]="15" /> New interview</button> }
          }
        </footer>
      </div>
    </dialog>
  `,
  styles: [DIALOG_STYLES, `
    h2 small { margin-left: 8px; font-size: 0.74rem; font-weight: 500; color: var(--text-2); }
    .tag { font-size: 0.72rem; color: var(--accent); }
    .q { font-size: 1.1rem; line-height: 1.4; }
    .grade { display: grid; gap: 7px; }
    .score { font-size: 0.9rem; color: var(--text-2); } .score b { font-size: 1.8rem; font-family: 'Space Grotesk', sans-serif; } .score small { margin-left: 8px; }
    .good { color: var(--good); } .warn { color: var(--warn); } .bad { color: var(--bad); }
    .pt { display: flex; gap: 8px; align-items: baseline; font-size: 0.86rem; }
    .pt app-icon { flex-shrink: 0; }
    details { border: 1px solid var(--border); border-radius: 14px; padding: 12px 14px; font-size: 0.84rem; }
    summary { cursor: pointer; font-weight: 600; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; color: var(--text-2); margin: 10px 0; line-height: 1.55; }
    a { color: var(--accent); }
    .res li { display: grid; grid-template-columns: 34px 1fr auto; gap: 10px; align-items: baseline; padding: 10px 0; border-top: 1px solid var(--border); font-size: 0.86rem; }
    .res b { font-size: 1.1rem; }
    @media (max-width: 520px) { .res li { grid-template-columns: 34px 1fr; } .res a { grid-column: 2; } }
  `],
})
export class Interview implements AfterViewInit, OnDestroy {
  readonly close = output<void>();
  protected readonly bus = inject(AssistantBus);
  protected readonly iv = inject(InterviewService);
  protected readonly cloud = inject(CloudService);
  protected readonly memory = inject(VisitorMemory);
  protected readonly voice = inject(VoiceService);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private topic = viewChild(Dropdown);
  protected readonly topicValue = linkedSignal(() => { const g = this.bus.interviewGroup(); return this.iv.choices().find(c => !!g && c.value.endsWith(g))?.value ?? 'mix'; });
  private answer = viewChild<ElementRef<HTMLTextAreaElement>>('answer');
  protected readonly scored = computed(() => this.iv.rounds().filter(r => r.grade).sort((a, b) => a.grade!.score - b.grade!.score));
  protected readonly title = (k: string) => chapter(k)?.title ?? '';
  protected readonly url = (k: string) => chapter(k)?.url ?? '';
  protected readonly tone = (n: number) => (n >= 7 ? 'good' : n >= 4 ? 'warn' : 'bad');

  constructor() {
    this.iv.stop();
    this.voice.stop();
  }

  ngAfterViewInit() {
    document.documentElement.style.overflow = 'hidden';
    this.dialog().nativeElement.showModal();
    this.topic()?.focus();
  }

  ngOnDestroy() {
    document.documentElement.style.overflow = '';
    if (this.voice.listening()) this.voice.stopListening();
    this.iv.stop();
  }

  protected async begin() {
    await this.iv.start(this.topicValue());
    this.focusAnswer();
  }

  protected async next() {
    await this.iv.next();
    this.focusAnswer();
  }

  protected submit(text = this.answer()?.nativeElement.value ?? '') {
    if (this.voice.listening()) this.voice.stopListening();
    void this.iv.submit(text);
  }

  protected async dictate() {
    if (this.voice.listening()) { this.voice.stopListening(); return; }
    const round = this.iv.current();
    const heard = await this.voice.listen();
    const box = this.answer()?.nativeElement;
    if (heard && box && this.iv.current() === round && this.iv.phase() === 'question') box.value = `${box.value} ${heard}`.trim();
  }

  private focusAnswer() {
    setTimeout(() => this.answer()?.nativeElement.focus());
  }
}
