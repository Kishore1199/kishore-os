import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Icon } from '../core/icon';
import { AssistantService as KaiService } from '../core/assistant.service';
import { AssistantBus as OsService } from '../core/assistant.bus';
import { OsService as Desktop } from '../core/os.service';
import { PetService } from '../core/pet.service';
import { ThemeService, prefersReducedMotion } from '../core/theme.service';
import { looksLikeJob } from '../core/looks-like-job';
import { GuideService } from '../core/guide.service';
import { LabRouter } from '../lab/lab-router';
import { LANGS } from '../core/language.service';
import { OfflineService } from '../core/offline.service';
import { SelectAsk } from './select-ask';
import { Interview } from './interview';
import { JobMatch } from './job-match';
import { Mood, Robot, Zone } from './robot';

const SUGGEST = ['Match a job description', 'Mock interview', 'Draft a message to Kishore', 'What is he working on?', 'What AI tools are there?', 'Start the tour', '1-minute tour for a Spring Boot recruiter', 'Where has he used Docker?', 'Put projects next to skills', 'Tile everything', 'Who is Kishore?', 'Tell me about the 75Health EMR', 'Show his experience', 'JWT notes', 'How do I contact him?', 'How was this site built?'];

/**
 * ALPHA, drawn as a mini robot. Idle, it sits in the corner as the chat button; when it talks it flies
 * into the screen, waves, and its mouth bars move with the voice (no subtitles — the chat keeps the text).
 */
@Component({
  selector: 'app-assistant',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Interview, JobMatch, SelectAsk, NgTemplateOutlet, Robot],
  template: `
    @if (os.matcher(); as m) {
      @defer (on immediate) { <app-job-match [seed]="m.text" (close)="os.matcher.set(null)" /> }
    }

    @if (os.interview()) {
      @defer (on immediate) { <app-interview (close)="os.interview.set(false)" /> }
    }

    <app-select-ask />

    <!-- an offer of help when the visitor lingers -->
    @if (guide.nudge(); as n) {
      <div class="nudge" role="status">
        <button type="button" class="x" (click)="guide.dismiss()" aria-label="No thanks"><app-icon name="close" [size]="13" /></button>
        <p>{{ n.text }}</p>
        <button type="button" class="go" (click)="guide.accept()">{{ n.action }}</button>
      </div>
    }

    <!-- chat panel -->
    @if (kai.chatOpen()) {
      <section class="panel" role="dialog" aria-label="Chat with ALPHA">
        <header>
          <div><b>ALPHA</b><small class="mono">here to assist you · {{ kai.cloud.aiOnline() ? 'Gemini agent' : kai.device.state() === 'ready' ? 'on-device AI' : 'offline brain' }} · {{ kai.voice.voiceName() || 'voice off' }}</small></div>
          <button type="button" class="wake" [class.on]="kai.voice.wakeOn()" (click)="kai.toggleWake()" [attr.aria-pressed]="kai.voice.wakeOn()" title="Wake ALPHA by saying &quot;Alpha&quot;"><app-icon name="mic" [size]="12" /> Alpha</button>
          <button type="button" class="tbtn" (click)="kai.tour()"><app-icon name="play" [size]="12" /> Tour</button>
          <button type="button" class="x" (click)="kai.chatOpen.set(false)" aria-label="Close chat"><app-icon name="close" [size]="15" /></button>
        </header>
        @if (!kai.cloud.aiOnline()) {
          @switch (kai.device.state()) {
            @case ('ask') { <p class="device">Gemini is resting. <button type="button" (click)="kai.device.enable()">Use Chrome's built-in AI</button>@if (kai.device.needsDownload()) { <small> Large one-time download, best on Wi-Fi.</small> }</p> }
            @case ('loading') { <p class="device" role="status">Getting the on-device AI ready… {{ kai.device.progress() ? (kai.device.progress() * 100).toFixed(0) + '%' : '' }}</p> }
          }
        }
        <div class="log" #log role="log">
          @for (m of kai.msgs(); track $index) {
            @if (m.steps?.length) { <ng-container [ngTemplateOutlet]="trace" [ngTemplateOutletContext]="{ $implicit: m.steps }" /> }
            @if ($last && m.from === 'kai' && kai.reveal() !== null) { <p class="m"><span class="sr">{{ m.text }}</span><span aria-hidden="true">{{ m.text.slice(0, kai.reveal()!) }}<i class="caret"></i></span></p> }
            @else { <p class="m" [class.me]="m.from === 'me'">{{ m.text }}</p> }
            @if ($last && m.chips?.length && kai.reveal() === null && !kai.thinking()) { <div class="chips">@for (c of m.chips; track c) { <button type="button" (click)="kai.ask(c)">{{ c }}</button> }</div> }
            @if (m.q) {
              <div class="rate">@if (m.vote) { <span>Thanks for the rating.</span> } @else { <button type="button" [title]="kai.feedback.hint" (click)="kai.rate(m, true)">Good answer</button><button type="button" [title]="kai.feedback.hint" (click)="kai.rate(m, false)">Not good</button> }</div>
            }
            @if (m.links?.length) {
              <div class="links">
                @for (l of m.links; track l.url) { <a [href]="l.url" [attr.target]="l.url.startsWith('mailto:') || l.url.startsWith('tel:') ? null : '_blank'" rel="noopener"><app-icon name="external" [size]="12" /> {{ l.label }}</a> }
              </div>
            }
          }
          @if (kai.voice.listening()) { <p class="m me live">{{ kai.voice.interim() || 'Listening…' }}</p> }
          @if (kai.liveSteps().length) { <ng-container [ngTemplateOutlet]="trace" [ngTemplateOutletContext]="{ $implicit: kai.liveSteps() }" /> }
          @if (kai.thinking()) { <p class="m dots" aria-label="ALPHA is thinking"><i></i><i></i><i></i></p> }
        </div>
        @if (kai.live()) { <div class="livebar" role="status"><i [class.on]="kai.voice.listening()"></i><span>{{ kai.voice.listening() ? (kai.voice.interim() || 'Listening…') : kai.thinking() ? 'Thinking…' : kai.voice.speaking() ? 'Speaking…' : 'Live' }}</span>@if (kai.voice.speaking()) { <button type="button" (click)="kai.voice.stop()">Interrupt</button> }<button type="button" (click)="kai.stopLive()">End</button></div> }
        <div class="sugg">@if (!kai.live()) { <button type="button" class="golive" (click)="kai.startLive()"><i></i>Live talk</button> }<select aria-label="Answer language" (change)="kai.lang.set($any($event.target).value)">@for (l of langs; track l.id) { <option [value]="l.id" [selected]="kai.lang.lang() === l.id">{{ l.label }}</option> }</select>@for (s of suggest; track s) { <button type="button" (click)="kai.ask(s)">{{ s }}</button> }</div>
        <form (submit)="$event.preventDefault(); kai.ask(inp.value); inp.value = ''">
          <button type="button" class="mic" [class.on]="kai.voice.listening()" (click)="kai.listenAndAsk()" [attr.aria-label]="kai.voice.listening() ? 'Stop listening' : 'Ask with your voice'" [disabled]="!kai.voice.canListen" [title]="kai.voice.canListen ? 'Ask out loud' : 'Voice input needs Chrome, Edge or Safari'">
            <app-icon name="mic" [size]="17" />
          </button>
          <input #inp class="field-in" (paste)="onPaste($event)" placeholder="Ask about projects, skills, notes…" aria-label="Ask ALPHA" autocomplete="off" />
          @if (kai.thinking() || kai.voice.speaking()) {
            <!-- while ALPHA thinks or talks: stop it (or just type a new question — that replaces the old one) -->
            <button type="button" class="send stop" (click)="kai.cancel()" aria-label="Stop ALPHA" title="Stop"><app-icon name="stop" [size]="15" /></button>
          } @else {
            <button type="submit" class="send" aria-label="Send"><app-icon name="send" [size]="16" /></button>
          }
        </form>
        <small class="fine">
          @if (kai.cloud.enabled) { Answers use Google Gemini. Please don't share confidential information. }
          @if (kai.memory.on()) {
            @if (kai.memory.summary()) { Remembered in this browser: {{ kai.memory.summary() }}. <button type="button" (click)="kai.forget()">Forget me</button> }
          } @else { Not remembering you. <button type="button" (click)="kai.memory.remember()">Remember me</button> }
        </small>
      </section>
    }

    <!-- what the agent did, step by step -->
    <ng-template #trace let-steps>
      <ul class="trace mono" aria-label="Steps ALPHA took">
        @for (s of $any(steps); track $index) {
          <li [class]="s.state"><app-icon [name]="s.icon" [size]="12" /><span>{{ s.label }}</span>@if (s.state === 'run') { <i class="spin"></i> } @else { <app-icon [name]="s.state === 'ok' ? 'check' : 'close'" [size]="12" /> }</li>
        }
      </ul>
    </ng-template>

    <!-- the robot -->
    <div class="dock-bot" [class.moved]="!!place()" [class.pet]="strolling()" [style.--walk.ms]="stroll()?.ms" [class.dragging]="dragging()" [style.left.px]="place()?.x" [style.top.px]="place()?.y" [class.live]="live() && !kai.chatOpen()" [class.talk]="kai.voice.speaking()" [class.listen]="kai.voice.listening()" [class.happy]="mood() === 'happy' || mood() === 'wink' || mood() === 'love'" #bot>
      @if (live()) {
        <div class="ctl" role="toolbar" aria-label="ALPHA controls">
          @if (kai.tourStep() >= 0) {
            <span class="mono step">{{ kai.tourStep() + 1 }}/{{ kai.tourTotal() }}</span>
            <button type="button" (click)="kai.pauseTour()" [attr.aria-label]="kai.tourPaused() ? 'Resume tour' : 'Pause tour'"><app-icon [name]="kai.tourPaused() ? 'play' : 'pause'" [size]="13" /></button>
            <button type="button" (click)="kai.skipTour()" aria-label="Next stop"><app-icon name="skip" [size]="13" /></button>
          }
          <button type="button" (click)="kai.stopTour()" aria-label="Stop ALPHA"><app-icon name="stop" [size]="13" /></button>
        </div>
        @if (kai.voice.speaking() && !kai.voice.enabled()) {
          <div class="bubble">Sound is off <button type="button" (click)="unmute()"><app-icon name="volume" [size]="12" /> Unmute</button></div>
        }
      }
      <div class="bot" (dblclick)="flash('love', 2000)" (pointerdown)="dragStart($event)" title="Drag me anywhere">
        @if (kai.voice.wakeLive()) { <span class="ear" [class.heard]="kai.voice.wakeHeard()" title="Listening for &quot;Alpha&quot;">👂</span> }
        <app-robot [mood]="mood()" (touched)="touch($event)" (pointerenter)="hover.set(true)" (pointerleave)="hover.set(false)" />
        <button type="button" class="name mono" (click)="toggleChat()" [attr.aria-label]="label() + ', talk to your assistant'">{{ label() }}</button>
      </div>
    </div>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 180; pointer-events: none; }
    :host > * { pointer-events: auto; }
    @keyframes fade-up { from { opacity: 0; transform: translate(-50%, 10px); } }

    /* ── robot ── */
    .dock-bot { position: fixed; right: 12px; bottom: 6px; width: 132px; display: grid; justify-items: center; transform-origin: bottom right;
      transition: transform 0.7s cubic-bezier(0.34, 1.4, 0.5, 1); --lv: 0; }
    /* talking: fly into the screen and grow */
    .dock-bot.live { transform: translate(-110px, -120px) scale(1.5); }
    .dock-bot.moved { right: auto; bottom: auto; transform-origin: center bottom; }
    .dock-bot.moved.live { transform: scale(1.35); }
    .dock-bot.pet { transform: scale(0.62); transition: transform 0.5s, left var(--walk, 2s) linear, top var(--walk, 2s) ease-in-out; } .dock-bot.pet .name { opacity: 0; }
    .dock-bot.dragging { transition: none; transform: scale(1.08) rotate(-4deg); cursor: grabbing; }
    .dock-bot.dragging app-robot { filter: drop-shadow(0 26px 22px rgba(0, 0, 0, 0.45)); }
    .bot { width: 132px; display: grid; justify-items: center; touch-action: none; cursor: grab; }
    .name { cursor: pointer; color: var(--text); margin-top: -2px; padding: 3px 11px; border-radius: 999px; font-size: 0.64rem; letter-spacing: 0.12em; text-transform: uppercase; background: var(--surface-solid); border: 1px solid var(--border-strong); white-space: nowrap; }

    .ctl { position: absolute; bottom: calc(100% + 2px); display: flex; align-items: center; gap: 3px; padding: 3px; border-radius: 999px;
      background: color-mix(in srgb, var(--surface-solid) 90%, transparent); border: 1px solid var(--border-strong); box-shadow: var(--shadow); transform: scale(0.65); transform-origin: bottom center; animation: fade-up 0.3s; white-space: nowrap; }
    .ctl button { width: 26px; height: 26px; border-radius: 50%; border: 0; background: var(--surface-2); cursor: pointer; display: grid; place-items: center; color: var(--text); }
    .ctl button:hover { background: var(--accent); color: #fff; }
    .step { padding: 0 6px; font-size: 0.7rem; color: var(--accent); }
    .bubble { position: absolute; right: calc(100% - 6px); top: 6px; display: flex; align-items: center; gap: 6px; padding: 5px 6px 5px 10px; border-radius: 12px 12px 2px 12px; white-space: nowrap;
      background: var(--surface-solid); border: 1px solid var(--border-strong); font-size: 0.62rem; font-weight: 600; transform: scale(0.65); transform-origin: right top; box-shadow: var(--shadow); }
    .bubble button { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; border: 0; background: var(--accent); color: #fff; cursor: pointer; font-size: 0.6rem; }

    /* ── chat panel ── */
    .panel { position: fixed; right: 18px; bottom: 194px; width: min(380px, calc(100vw - 24px)); height: min(540px, calc(100dvh - 254px)); display: flex; flex-direction: column; border-radius: 22px; overflow: hidden;
      background: color-mix(in srgb, var(--surface-solid) 88%, transparent); backdrop-filter: blur(24px); border: 1px solid var(--border-strong); box-shadow: var(--shadow); animation: fade-up 0.25s; }
    header { display: flex; align-items: center; gap: 8px; padding: 14px 14px 12px 18px; border-bottom: 1px solid var(--border); }
    header div { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    header b { font-family: var(--display); font-size: 1.1rem; }
    header small { font-size: 0.64rem; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tbtn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 999px; border: 0; cursor: pointer; color: #fff; background: linear-gradient(135deg, var(--violet), var(--accent)); font-size: 0.76rem; font-weight: 600; }
    .wake { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 999px; border: 1px solid var(--border-strong); background: none; cursor: pointer; font-size: 0.72rem; font-weight: 600; color: var(--text-2); }
    .wake.on { color: #fff; border-color: #2dd4bf; background: #2dd4bf; box-shadow: 0 0 12px color-mix(in srgb, #2dd4bf 60%, transparent); }
    .ear { position: absolute; top: 4px; left: 6px; z-index: 2; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; font-size: 14px;
      background: var(--surface-solid); border: 1px solid #2dd4bf; box-shadow: 0 0 10px color-mix(in srgb, #2dd4bf 70%, transparent); animation: earpulse 2s ease-in-out infinite; }
    .ear.heard { border-color: #fde047; box-shadow: 0 0 16px #fde047; transform: scale(1.2); }
    @keyframes earpulse { 50% { box-shadow: 0 0 2px color-mix(in srgb, #2dd4bf 40%, transparent); } }
    .bot { position: relative; }
    .x { width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--border-strong); background: none; cursor: pointer; display: grid; place-items: center; }
    header, .sugg, form { flex-shrink: 0; }
    .log { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    .m { max-width: 88%; padding: 9px 13px; border-radius: 16px 16px 16px 5px; background: var(--surface-2); border: 1px solid var(--border); font-size: 0.88rem; }
    .m.me { align-self: flex-end; border-radius: 16px 16px 5px 16px; color: #fff; border: 0; background: linear-gradient(135deg, var(--violet), color-mix(in srgb, var(--violet) 60%, var(--accent))); }
    .m.live { opacity: 0.7; font-style: italic; }
    .dots { display: flex; gap: 4px; width: fit-content; }
    .dots i { width: 7px; height: 7px; border-radius: 50%; background: var(--text-3); animation: bounce 1s infinite; }
    .dots i:nth-child(2) { animation-delay: 0.15s; } .dots i:nth-child(3) { animation-delay: 0.3s; }
    @keyframes bounce { 50% { transform: translateY(-5px); } }
    .trace { list-style: none; margin: 0; padding: 2px 0 2px 10px; display: grid; gap: 4px; border-left: 2px solid color-mix(in srgb, var(--accent) 45%, transparent); font-size: 0.7rem; color: var(--text-2); }
    .trace li { display: flex; align-items: center; gap: 7px; animation: step-in 0.25s; }
    .trace li.ok > app-icon:last-child { color: #2dd4bf; }
    .trace li.fail > app-icon:last-child { color: #ef4444; }
    .trace .spin { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--border-strong); border-top-color: var(--accent); animation: spin 0.8s linear infinite; }
    @keyframes step-in { from { opacity: 0; transform: translateX(-6px); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .links { display: flex; flex-wrap: wrap; gap: 6px; }
    .links a { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--accent); color: var(--accent); font-size: 0.76rem; font-weight: 600; text-decoration: none; }
    .links a:hover { color: #fff; background: var(--accent); }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; } .caret { display: inline-block; width: 7px; height: 1em; margin-left: 2px; vertical-align: -2px; background: var(--accent); animation: caret 0.7s steps(2) infinite; } @keyframes caret { 50% { opacity: 0; } }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; } .chips button { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--accent); background: none; color: var(--text); font-size: 0.78rem; font-weight: 600; cursor: pointer; } .chips button:hover { background: var(--accent-soft); }
    .livebar { flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-top: 1px solid var(--border); font-size: 0.8rem; color: var(--text); } .livebar span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .livebar button { padding: 5px 11px; border-radius: 999px; border: 1px solid var(--border-strong); background: none; color: var(--text); font-size: 0.74rem; cursor: pointer; }
    .livebar i, .golive i { width: 9px; height: 9px; border-radius: 50%; background: #ef4444; flex-shrink: 0; } .livebar i.on { animation: pulse 1.1s infinite; } .sugg .golive { display: inline-flex; align-items: center; gap: 7px; color: var(--text); font-weight: 700; border-color: #ef4444; }
    .rate { display: flex; gap: 12px; font-size: 0.72rem; color: var(--text-2); margin-top: -3px; } .rate button { border: 0; background: none; padding: 0; font: inherit; color: var(--text-2); cursor: pointer; text-decoration: underline; } .rate button:hover { color: var(--accent); }
    .sugg select { flex-shrink: 0; padding: 5px 8px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--surface-solid); color: var(--text-2); font-size: 0.74rem; }
    .fine button, .device button { border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: var(--accent); cursor: pointer; text-decoration: underline; }
    .device { flex-shrink: 0; padding: 8px 16px; font-size: 0.76rem; color: var(--text-2); border-bottom: 1px solid var(--border); }
    .nudge { position: fixed; right: 150px; bottom: 74px; width: min(270px, calc(100vw - 32px)); padding: 13px 15px; border-radius: 18px 18px 4px 18px; background: var(--surface-solid); border: 1px solid var(--border-strong); box-shadow: var(--shadow); animation: fade-nudge 0.3s; font-size: 0.86rem; display: grid; gap: 9px; }
    .nudge p { padding-right: 26px; }
    .nudge .x { position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; }
    .nudge .go { justify-self: start; padding: 6px 13px; border-radius: 999px; border: 0; cursor: pointer; color: var(--bg); background: var(--text); font-size: 0.8rem; font-weight: 600; }
    @keyframes fade-nudge { from { opacity: 0; transform: translateY(8px); } }
    .fine { flex-shrink: 0; padding: 0 14px 10px; margin-top: -6px; font-size: 0.64rem; color: var(--text-3); text-align: center; }
    .sugg { display: flex; gap: 6px; overflow-x: auto; padding: 8px 12px; scrollbar-width: none; border-top: 1px solid var(--border); }
    .sugg button { flex-shrink: 0; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--border-strong); background: none; cursor: pointer; font-size: 0.74rem; color: var(--text-2); }
    .sugg button:hover { color: var(--accent); border-color: var(--accent); }
    form { display: flex; flex-shrink: 0; align-items: center; gap: 8px; padding: 12px 14px 14px; }
    form .field-in { flex: 1; min-width: 0; height: 46px; padding: 0 14px; font: inherit; font-size: 0.9rem; color: var(--text);
      border-radius: 14px; border: 1px solid var(--border-strong); background: color-mix(in srgb, var(--surface-2) 70%, transparent); outline: 0;
      transition: border-color 0.15s, box-shadow 0.15s; }
    form .field-in::placeholder { color: var(--text-3); }
    form .field-in:focus { border-color: var(--accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent); }
    .mic, .send { flex-shrink: 0; width: 46px; height: 46px; border-radius: 14px; border: 1px solid var(--border-strong); background: var(--surface-2); cursor: pointer; display: grid; place-items: center; }
    .mic.on { color: #fff; background: #2dd4bf; border-color: #2dd4bf; animation: pulse 1.2s infinite; }
    .mic:disabled { opacity: 0.4; cursor: not-allowed; }
    .send { border: 0; color: #fff; background: var(--accent); }
    .send.stop { background: #ef4444; animation: stop-pulse 1.2s ease-in-out infinite; }
    @keyframes stop-pulse { 50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.25); } }
    @keyframes pulse { 50% { box-shadow: 0 0 0 8px color-mix(in srgb, #2dd4bf 25%, transparent); } }

    @media (max-width: 760px) {
      .dock-bot { bottom: 76px; right: 4px; transform: scale(0.72); }
      .dock-bot.pet { transform: scale(0.55); }
      .dock-bot.live { transform: translate(-50px, -70px) scale(1.05); }
      .dock-bot.moved { transform: scale(0.72); }
      .dock-bot.moved.live { transform: scale(0.95); }
      .nudge { right: 16px; bottom: 222px; }
      .panel { right: 12px; bottom: 80px; height: calc(100dvh - 132px); z-index: 3; }
    }
    @media (prefers-reduced-motion: reduce) { .dock-bot.live { transform: scale(1.2); } }
  `,
})
export class Assistant {
  protected readonly kai = inject(KaiService);
  protected readonly suggest = SUGGEST;
  protected readonly langs = LANGS;
  /** each mouth bar reacts with a different strength so it looks like speech, not a meter */
  protected readonly bars = [1.6, 2.6, 3.2, 2.4, 1.4];
  private log = viewChild<ElementRef<HTMLElement>>('log');
  private bot = viewChild.required<ElementRef<HTMLElement>>('bot');

  protected readonly hover = signal(false);
  /** dozes off after a quiet spell; any activity wakes it with a wink */
  private readonly sleeping = signal(false);
  private sleepT?: ReturnType<typeof setTimeout>;
  private yawnT?: ReturnType<typeof setTimeout>;
  private taps: number[] = [];
  protected os = inject(OsService);
  private theme = inject(ThemeService);
  protected readonly guide = inject(GuideService);
  /** short-lived reaction (a grin after speaking, a wink now and then, a cheer when poked) */
  private readonly react = signal<Mood | null>(null);
  private reactT?: ReturnType<typeof setTimeout>;

  protected readonly mood = computed<Mood>(() => {
    if (this.kai.voice.listening()) return 'listen';
    if (this.dragging()) return 'happy';
    if (this.kai.thinking()) return 'listen';
    if (this.kai.voice.speaking()) return 'talk';
    return this.react() ?? (this.hover() ? 'happy' : this.sleeping() ? 'sleep' : 'idle');
  });
  protected readonly label = computed(() => this.dragging() ? 'wheee!' : this.kai.voice.wakeHeard() ? 'yes?' : this.kai.thinking() ? 'thinking…' : ({ listen: 'listening…', talk: 'speaking', happy: 'hi there!', wink: ':)', love: '♥ aww, thanks!', sleep: 'zzz…', idle: 'ask alpha', blink: 'blink blink!', giggle: 'hehe, that tickles!', dizzy: 'whoa… dizzy', highfive: 'high five! ✋', shy: 'aww, stop…', wow: 'wow! ✨', cool: 'cool 😎', angry: 'hey! stop poking!', sad: 'aww… sorry', party: 'yay! 🎉', yawn: 'yaawn…' })[this.mood()]);

  /** robot is "on stage" while it talks, listens, or a tour is running */
  protected readonly live = computed(() => this.kai.voice.speaking() || this.kai.voice.listening() || (this.kai.tourStep() >= 0 && !this.kai.tourPaused()));

  /** custom position (top-left, px) after the visitor drags ALPHA; null = default corner */
  protected readonly pos = signal<{ x: number; y: number } | null>(this.loadPos());
  protected readonly dragging = signal(false);
  private desktop = inject(Desktop);
  private pet = inject(PetService);
  /** where it stands in pet mode */
  protected readonly stroll = signal<{ x: number; y: number; ms: number } | null>(null);
  protected readonly strolling = computed(() => !!this.stroll() && !this.live() && !this.dragging() && !this.kai.chatOpen());
  protected readonly place = computed(() => (this.strolling() ? this.stroll() : this.pos()));

  /** A place to stand: on the window in front when there is room above it, or along the dock. */
  private spot(): { x: number; y: number } {
    const el = this.bot().nativeElement, w = el.offsetWidth, h = el.offsetHeight, scale = 0.62;
    const f = this.desktop.wins().find(x => x.id === this.desktop.focused());
    const roof = f && !f.max && f.y - h * scale > 40;
    if (roof && Math.random() < 0.5) return { x: Math.max(0, Math.min(innerWidth - w, f.x + Math.random() * Math.max(0, f.w - w))), y: f.y - h + 18 };
    return { x: 10 + Math.random() * Math.max(0, innerWidth - w - 20), y: innerHeight - h - (innerWidth < 760 ? 62 : 64) };
  }
  private justDragged = false;

  constructor() {
    inject(LabRouter);
    inject(OfflineService); // catches the install prompt early
    const injector = inject(Injector);
    let stopGuide = () => {};
    afterNextRender(() => { stopGuide = this.guide.start(); void import('../core/webmcp.service').then(m => injector.get(m.WebMcp).register()).catch(e => console.warn('[ALPHA] WebMCP not loaded', e)); });
    inject(DestroyRef).onDestroy(() => stopGuide());
    addEventListener('resize', () => { const p = this.pos(); if (p) this.pos.set(this.clamp(p.x, p.y)); });
    effect(() => {
      this.kai.msgs(); this.kai.reveal(); this.kai.live(); this.kai.thinking(); this.kai.liveSteps(); this.kai.voice.interim();
      const el = this.log()?.nativeElement;
      if (el) requestAnimationFrame(() => requestAnimationFrame(() => (el.scrollTop = el.scrollHeight))); // after the new text and buttons are on screen
    });
    // feed the voice level straight into a CSS variable (no template re-render per frame)
    effect(() => this.bot().nativeElement.style.setProperty('--lv', this.kai.voice.level().toFixed(3)));
    // it hurries while windows move
    let walkT: ReturnType<typeof setTimeout>;
    const walk = (ms: number) => {
      const el = this.bot().nativeElement.querySelector('app-robot');
      if (!el) return;
      el.classList.add('walking');
      clearTimeout(walkT);
      walkT = setTimeout(() => el.classList.remove('walking'), ms);
    };
    let firstWins = true;
    effect(() => { this.desktop.wins(); if (firstWins) { firstWins = false; return; } untracked(() => walk(320)); });
    inject(DestroyRef).onDestroy(() => clearTimeout(walkT));
    // pet mode: every few seconds it picks a spot along the dock, or on top of a window
    effect(clean => {
      if (!this.pet.on()) { untracked(() => this.stroll.set(null)); return; }
      const step = () => {
        if (document.hidden || this.dragging() || this.live() || this.kai.chatOpen() || this.kai.thinking() || prefersReducedMotion()) return;
        const from = this.stroll()?.x ?? innerWidth - 150;
        const to = this.spot();
        const ms = Math.min(6000, Math.max(900, Math.abs(to.x - from) * 9));
        this.stroll.set({ ...to, ms });
        walk(ms);
      };
      untracked(step);
      const t = setInterval(step, 8000);
      clean(() => clearInterval(t));
    });
    // reactions requested from anywhere on the page (copy → party, projects → wow, …)
    effect(() => {
      const e = this.os.emote();
      if (e && !this.kai.voice.speaking()) untracked(() => { this.sleeping.set(false); this.flash(e.mood as Mood, e.ms); });
    });
    // theme switch → sunglasses
    let firstTheme = true;
    effect(() => {
      this.theme.isDark();
      if (firstTheme) { firstTheme = false; return; }
      untracked(() => this.flash('cool', 1900));
    });
    // eyes follow the pointer (rAF-throttled, writes two CSS variables)
    let eyeRaf = 0;
    addEventListener('pointermove', (ev: PointerEvent) => {
      if (eyeRaf || this.mood() !== 'idle' && this.mood() !== 'happy') return;
      eyeRaf = requestAnimationFrame(() => {
        eyeRaf = 0;
        const el = this.bot().nativeElement, r = el.getBoundingClientRect();
        const dx = (ev.clientX - (r.left + r.width / 2)) / (innerWidth / 2), dy = (ev.clientY - (r.top + r.height * 0.3)) / (innerHeight / 2);
        el.style.setProperty('--ex', Math.max(-1, Math.min(1, dx * 1.6)).toFixed(2));
        el.style.setProperty('--ey', Math.max(-1, Math.min(1, dy * 1.6)).toFixed(2));
      });
    }, { passive: true });
    // grin + wink right after it finishes talking
    let was = false;
    effect(() => {
      const now = this.kai.voice.speaking();
      if (was && !now) untracked(() => this.flash('wink', 1800));
      was = now;
    });
    // fall asleep after 40 s without any activity
    const wake = () => {
      if (this.sleeping()) { this.sleeping.set(false); this.flash('wink', 1400); }
      clearTimeout(this.sleepT);
      clearTimeout(this.yawnT);
      this.yawnT = setTimeout(() => { if (this.mood() === 'idle' && !this.kai.chatOpen()) this.flash('yawn', 2600); }, 36000);
      this.sleepT = setTimeout(() => { if (!this.kai.voice.speaking() && !this.kai.chatOpen()) this.sleeping.set(true); }, 40000);
    };
    ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(ev => addEventListener(ev, wake, { passive: true }));
    wake();
    // love reaction when the visitor says something nice
    effect(() => {
      const last = this.kai.msgs().filter(m => m.from === 'me').pop();
      if (last && /thank|love|awesome|great|nice|cool|amazing|good job|super/i.test(last.text)) untracked(() => this.flash('love', 2600));
    });
    // an idle wink every so often
    setInterval(() => { if (this.mood() === 'idle' && !document.hidden) this.flash('wink', 900); }, 14000);
  }

  /** touching different parts of the robot triggers different reactions */
  /** Press and move more than a few pixels to carry ALPHA; a plain tap still triggers a reaction. */
  protected dragStart(e: PointerEvent) {
    if (e.button !== 0) return;
    const el = this.bot().nativeElement, r = el.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY, ox = sx - r.left, oy = sy - r.top;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      if (!moved) { moved = true; this.dragging.set(true); this.sleeping.set(false); }
      ev.preventDefault();
      this.pos.set(this.clamp(ev.clientX - ox, ev.clientY - oy));
    };
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      if (!moved) return;
      this.dragging.set(false);
      this.justDragged = true; // swallow the click that follows the drop
      setTimeout(() => (this.justDragged = false), 50);
      if (this.pet.on()) { this.stroll.set({ ...this.pos()!, ms: 400 }); this.pos.set(null); return; } // it walks on from here
      const p = this.pos()!;
      // dropped near the bottom-right corner → snap home
      if (p.x + el.offsetWidth > innerWidth - 90 && p.y + el.offsetHeight > innerHeight - 90) this.pos.set(null);
      else this.flash('wink', 900);
      try { localStorage.setItem('kv-bot-pos', JSON.stringify(this.pos())); } catch { /* ignore */ }
    };
    addEventListener('pointermove', move, { passive: false });
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  }

  private clamp(x: number, y: number) {
    const el = this.bot()?.nativeElement;
    const w = el?.offsetWidth ?? 132, h = el?.offsetHeight ?? 180;
    return { x: Math.max(0, Math.min(innerWidth - w, x)), y: Math.max(44, Math.min(innerHeight - h, y)) };
  }

  private loadPos(): { x: number; y: number } | null {
    try { const v = JSON.parse(localStorage.getItem('kv-bot-pos') ?? 'null'); return v && typeof v.x === 'number' ? v : null; } catch { return null; }
  }

  /** a job description pasted into the chat opens the matcher with its line breaks intact */
  protected onPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text') ?? '';
    if (!looksLikeJob(text)) return;
    e.preventDefault();
    this.os.openMatcher(text);
  }

  protected toggleChat() {
    if (!this.justDragged) this.kai.chatOpen.set(!this.kai.chatOpen());
  }

  protected touch(z: Zone) {
    if (this.justDragged) return;
    if (this.kai.voice.speaking()) return;
    this.sleeping.set(false);
    const map: Record<Zone, [Mood, number]> = { face: ['blink', 800], belly: ['giggle', 1800], head: ['dizzy', 2200], hand: ['highfive', 1500], ear: ['shy', 1800], feet: ['party', 2400] };
    // poke it 5 times within 2.5 s and it gets grumpy
    const now = Date.now();
    this.taps = [...this.taps.filter(t => now - t < 2500), now];
    if (this.taps.length >= 5) { this.taps = []; this.flash('angry', 2200); return; }
    const [m, ms] = map[z];
    this.flash(m, ms);
  }

  protected flash(m: Mood, ms: number) {
    this.react.set(m);
    clearTimeout(this.reactT);
    this.reactT = setTimeout(() => this.react.set(null), ms);
  }



  protected unmute() {
    this.kai.voice.toggle();
    if (this.kai.tourStep() >= 0) this.kai.replayTourStep(); // replay the current tour stop so it is actually heard
    else this.kai.voice.stop();
  }

}
