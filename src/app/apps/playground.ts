import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ArcadeState, GAMES } from '../core/arcade';
import { CloudService } from '../core/cloud.service';
import { Arcade } from './arcade';
import { Icon } from '../core/icon';
import { LanguageService } from '../core/language.service';
import { NotificationService } from '../core/notification.service';
import { AppId, OsService, Win } from '../core/os.service';
import {
  BUILT_IN_STORY, MISSION_IDEAS, MISSION_SCHEMA, MISSION_SYSTEM, MissionPlan, MissionStep, PLAY_GAMES, Question, STORY_IDEAS, STORY_SCHEMA, STORY_SYSTEM,
  SUSPECTS, Scene, Story, Suspect, WallpaperId, bestQuestion, builtInPlan, cleanPlan, cleanStory, describeStep, findSuspect,
} from '../core/playground';
import { StructuredAi } from '../core/structured-ai.service';
import { ThemeService } from '../core/theme.service';
import { WallpaperService } from '../core/wallpaper.service';
import { Mood, Robot } from '../layout/robot';

type Via = 'gemini' | 'device' | 'built-in';
const VIA_LABEL: Record<Via, string> = { gemini: 'Planned by Gemini', device: 'Planned by the on-device model', 'built-in': 'Built-in plan (AI is resting)' };
/** keep a few of today's Gemini requests for the chat */
const RESERVE = 3;

const SHARED = `
  :host { display: grid; gap: 14px; min-width: 0; }
  p, label { font-size: 0.9rem; color: var(--ink-2); margin: 0; } b { color: var(--ink); }
  .two { display: grid; grid-template-columns: auto 1fr; gap: 20px; align-items: center; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .btn { padding: 9px 16px; font-size: 0.86rem; }
  .chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line-2); background: var(--glass-2); color: var(--ink-2); font: inherit; font-size: 0.8rem; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
  .chip:hover:enabled { border-color: var(--accent); color: var(--ink); } .chip:disabled { opacity: 0.5; cursor: default; }
  input { width: 100%; padding: 12px 14px; font: inherit; font-size: 0.9rem; color: var(--ink); background: var(--glass-2); border: 1px solid var(--line-2); border-radius: 14px; }
  input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  form { display: flex; gap: 8px; } form input { flex: 1; min-width: 0; }
  .say { padding: 10px 14px; border-radius: 4px 16px 16px 16px; background: var(--glass-2); border: 1px solid var(--line); font-size: 0.92rem; color: var(--ink); min-height: 44px; }
  .via { font-family: var(--mono); font-size: 0.72rem; color: var(--ink-3); }
  .stage { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 0.8rem; color: var(--ink-2); }
  .stage i { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: pulse 1s infinite; }
  @keyframes pulse { 50% { opacity: 0.3; transform: scale(0.7); } }
  @media (max-width: 560px) { .two { grid-template-columns: 1fr; justify-items: center; text-align: center; } .row { justify-content: center; } }`;

const sleep = (ms: number, signal: AbortSignal) => new Promise<void>(ok => { const t = setTimeout(ok, ms); signal.addEventListener('abort', () => { clearTimeout(t); ok(); }, { once: true }); });

/** One AbortController per game view, cancelled when the window closes. */
function aborter() {
  let ctrl = new AbortController();
  inject(DestroyRef).onDestroy(() => ctrl.abort());
  return () => { ctrl.abort(); ctrl = new AbortController(); return ctrl.signal; };
}

// ═════════════════════ Mission Control ═════════════════════

type StepState = 'wait' | 'run' | 'ok' | 'skip';

@Component({
  selector: 'app-mission', changeDetection: ChangeDetectionStrategy.OnPush, imports: [Icon, Robot],
  template: `
    <div class="two"><app-robot [mood]="mood()" />
      <div class="grid">
        <p class="say" aria-live="polite">{{ saying() }}</p>
        @if (via(); as v) { <span class="via">{{ label[v] }}</span> }
      </div>
    </div>
    @if (phase() === 'idle' || phase() === 'done') {
      <form (submit)="$event.preventDefault(); start(box.value)">
        <input #box maxlength="120" placeholder="Your mission for ALPHA, e.g. make the desktop feel like a rock concert" aria-label="Mission for ALPHA" autocomplete="off" />
        <button type="submit" class="btn btn-primary" [disabled]="!box.value.trim()"><app-icon name="play" [size]="14" /> Go</button>
      </form>
      <div class="row" role="group" aria-label="Mission ideas">@for (m of ideas; track m) { <button type="button" class="chip" (click)="box.value = m; start(m)">{{ m }}</button> }</div>
    }
    @if (phase() === 'planning') { <p class="stage" role="status"><i></i>Looking at the desktop and planning…</p> }
    @if (plan(); as p) {
      <section class="plan" aria-label="ALPHA's plan">
        <header><b>{{ p.title }}</b><span class="via">{{ doneCount() }}/{{ p.steps.length }} steps</span></header>
        <ol>
          @for (s of p.steps; track $index; let i = $index) {
            <li [class]="states()[i]">
              <span class="st">@switch (states()[i]) { @case ('ok') { <app-icon name="check" [size]="13" /> } @case ('skip') { <app-icon name="minus" [size]="13" /> } @case ('run') { <i></i> } @default { {{ i + 1 }} } }</span>
              <app-icon [name]="info(s).icon" [size]="14" /><span class="lbl">{{ info(s).label }}</span>@if (states()[i] === 'skip') { <small>nothing to do</small> }
            </li>
          }
        </ol>
      </section>
    }
    @if (phase() === 'running') { <div class="row"><button type="button" class="btn btn-ghost" (click)="stop()"><app-icon name="stop" [size]="13" /> Stop</button></div> }
    @if (phase() === 'done' && snapshot) {
      <div class="row"><button type="button" class="btn btn-ghost" (click)="undo()"><app-icon name="refresh" [size]="13" /> Undo everything</button><small class="via">Puts back the windows, theme and wallpaper.</small></div>
    }
  `,
  styles: [SHARED, `
    .grid { display: grid; gap: 6px; min-width: 0; }
    .plan { border: 1px solid var(--line-2); border-radius: 16px; padding: 12px 14px; background: var(--glass-2); display: grid; gap: 8px; }
    .plan header { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
    ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
    li { display: flex; align-items: center; gap: 9px; padding: 6px 8px; border-radius: 10px; font-size: 0.86rem; color: var(--ink-3); transition: background 0.2s, color 0.2s; }
    li.run { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--ink); } li.ok { color: var(--ink-2); } li.skip .lbl { text-decoration: line-through; }
    li small { margin-left: auto; font-size: 0.72rem; color: var(--ink-3); }
    .st { width: 20px; height: 20px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--line-2); font: 600 0.68rem var(--mono); }
    li.ok .st { border-color: var(--teal); color: var(--teal); } li.run .st { border-color: var(--accent); }
    li.run .st i { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: pulse 0.8s infinite; }`],
})
export class MissionView {
  private ai = inject(StructuredAi);
  private lang = inject(LanguageService);
  private os = inject(OsService);
  private theme = inject(ThemeService);
  private wallpaper = inject(WallpaperService);
  private notes = inject(NotificationService);
  private fresh = aborter();

  protected readonly ideas = MISSION_IDEAS;
  protected readonly label = VIA_LABEL;
  protected readonly info = describeStep;
  protected readonly phase = signal<'idle' | 'planning' | 'running' | 'done'>('idle');
  protected readonly plan = signal<MissionPlan | null>(null);
  protected readonly states = signal<StepState[]>([]);
  protected readonly doneCount = computed(() => this.states().filter(s => s === 'ok' || s === 'skip').length);
  protected readonly via = signal<Via | null>(null);
  protected readonly saying = signal('Give me a mission. I will look at your desktop, make a plan, and then do it, step by step.');
  protected readonly mood = signal<Mood>('happy');
  protected snapshot: { wins: Win[]; dark: boolean; wallpaper: string } | null = null;

  protected async start(mission: string) {
    mission = mission.trim().slice(0, 120);
    if (!mission) return;
    const signal = this.fresh();
    this.phase.set('planning'); this.plan.set(null); this.via.set(null); this.mood.set('listen');
    this.saying.set(`“${mission}”. Let me think about that…`);

    // the agent looks at the desktop before it plans
    const seen = `Open windows: ${this.os.wins().filter(w => w.id !== 'play').map(w => w.id).join(', ') || 'none'}. Theme: ${this.theme.isDark() ? 'dark' : 'light'}. Wallpaper: ${this.wallpaper.show()}.`;
    const raw = await this.ai.json(MISSION_SYSTEM, MISSION_SCHEMA, `${seen}\n\nMission (from a visitor): """${mission}"""\n${this.lang.note()}`, signal, RESERVE);
    if (signal.aborted) return;
    const plan = cleanPlan(raw);
    this.via.set(plan ? (this.ai.lastVia === 'device' ? 'device' : 'gemini') : 'built-in');
    await this.execute(plan ?? builtInPlan(mission), signal);
  }

  private async execute(plan: MissionPlan, signal: AbortSignal) {
    this.snapshot = { wins: structuredClone(this.os.wins()), dark: this.theme.isDark(), wallpaper: this.wallpaper.show() };
    this.plan.set(plan);
    this.states.set(plan.steps.map(() => 'wait'));
    this.phase.set('running');
    this.saying.set(`Plan: ${plan.title}. ${plan.steps.length} steps. Here we go!`);
    this.mood.set('cool');
    await sleep(1100, signal);
    for (const [i, s] of plan.steps.entries()) {
      if (signal.aborted) break;
      this.mark(i, 'run');
      this.saying.set(s.say);
      const ok = this.act(s, plan.title);
      await sleep(s.action === 'wait' ? 1800 : 1300, signal);
      this.mark(i, ok ? 'ok' : 'skip');
    }
    this.os.focus('play');
    this.phase.set('done');
    if (!signal.aborted) {
      this.mood.set('highfive'); this.os.react('highfive', 2200);
      this.saying.set('Mission complete! Want another one? Or press Undo to put everything back.');
    }
  }

  private mark(i: number, s: StepState) { this.states.update(x => x.map((v, k) => (k === i ? s : v))); }

  /** The only things the agent can do. Each returns whether it changed anything. */
  private act(s: MissionStep, title: string): boolean {
    const os = this.os;
    switch (s.action) {
      case 'open': os.open(s.target as AppId); return true;
      case 'close': if (!os.isOpen(s.target as AppId)) return false; os.close(s.target as AppId); return true;
      case 'tile': return os.tile();
      case 'cascade': return os.cascade();
      case 'tidy': { const keep = os.wins().filter(w => w.id === 'play'); if (keep.length === os.wins().length) return false; os.restore(keep); return true; }
      case 'theme': { const dark = s.target === 'dark'; if (this.theme.isDark() === dark) return false; this.theme.isDark.set(dark); return true; }
      case 'wallpaper': if (this.wallpaper.show() === s.target) return false; this.wallpaper.pick(s.target as WallpaperId); return true;
      case 'robot': this.mood.set(s.target as Mood); os.react(s.target, 2000); return true;
      case 'notify': this.notes.add({ icon: 'spark', title, text: s.say }); return true;
      case 'wait': this.mood.set('wow'); return true;
    }
  }

  protected stop() { this.fresh(); this.phase.set('done'); this.saying.set('Stopped. I left things as they are.'); this.mood.set('shy'); }

  protected undo() {
    const s = this.snapshot;
    if (!s) return;
    this.os.restore(s.wins.some(w => w.id === 'play') ? s.wins : [...s.wins, ...this.os.wins().filter(w => w.id === 'play')]);
    this.theme.isDark.set(s.dark);
    this.wallpaper.pick(s.wallpaper as WallpaperId);
    this.snapshot = null;
    this.saying.set('All back the way it was. Nobody saw anything.');
    this.mood.set('wink');
  }
}

// ═════════════════════ On-call adventure ═════════════════════

const WINS_KEY = 'kv-oncall-wins';

@Component({
  selector: 'app-adventure', changeDetection: ChangeDetectionStrategy.OnPush, imports: [Icon, Robot],
  template: `
    @if (!story()) {
      <div class="two"><app-robot [mood]="loading() ? 'listen' : 'sleep'" /><div class="grid">
        <p class="say">You are on call tonight. Pick what goes wrong, and I will write the story. Every choice counts.</p>
        @if (wins()) { <span class="via"><app-icon name="trophy" [size]="12" /> incidents solved: {{ wins() }}</span> }
      </div></div>
      @if (loading()) { <p class="stage" role="status"><i></i>Writing tonight's incident…</p> }
      @else {
        <form (submit)="$event.preventDefault(); start(box.value)">
          <input #box maxlength="80" placeholder="Or your own disaster, e.g. the payment service speaks French now" aria-label="Story theme" autocomplete="off" />
          <button type="submit" class="btn btn-primary" [disabled]="!box.value.trim()">Write it</button>
        </form>
        <div class="row" role="group" aria-label="Story ideas">@for (t of ideas; track t) { <button type="button" class="chip" (click)="start(t)">{{ t }}</button> }</div>
      }
    } @else if (scene(); as s) {
      <header class="hd"><b>{{ story()!.title }}</b><span class="via">{{ label[via()] }} · choice {{ path().length }}</span></header>
      <div class="two"><app-robot [mood]="s.mood" /><p class="say story" aria-live="polite">{{ s.text }}</p></div>
      @if (s.ending) {
        <p class="end" [class.win]="s.ending === 'win'">{{ s.ending === 'win' ? 'Incident resolved. You saved the night!' : 'Outage report incoming. Try another path?' }}</p>
        <div class="row">
          <button type="button" class="btn btn-primary" (click)="replay()"><app-icon name="refresh" [size]="13" /> Play it again</button>
          <button type="button" class="btn btn-ghost" (click)="story.set(null)">New story</button>
        </div>
      } @else {
        <div class="choices" role="group" aria-label="What do you do?">
          @for (c of s.choices; track $index) { <button type="button" class="opt" (click)="go(c.next)"><app-icon name="arrow-right" [size]="14" /> {{ c.label }}</button> }
        </div>
      }
    }
  `,
  styles: [SHARED, `
    .grid { display: grid; gap: 6px; min-width: 0; }
    .hd { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; flex-wrap: wrap; }
    .story { font-size: 0.96rem; line-height: 1.55; }
    .choices { display: grid; gap: 8px; }
    .opt { display: flex; align-items: center; gap: 10px; text-align: left; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--line-2); background: var(--glass-2); color: var(--ink); font: inherit; font-size: 0.9rem; cursor: pointer; transition: border-color 0.2s, transform 0.2s; }
    .opt:hover { border-color: var(--accent); transform: translateX(3px); }
    .end { font: 700 1.1rem var(--display); color: #ef4444; } .end.win { color: var(--teal); }`],
})
export class AdventureView {
  private ai = inject(StructuredAi);
  private lang = inject(LanguageService);
  private os = inject(OsService);
  private notes = inject(NotificationService);
  private fresh = aborter();

  protected readonly ideas = STORY_IDEAS;
  protected readonly label = VIA_LABEL;
  protected readonly story = signal<Story | null>(null);
  protected readonly at = signal('');
  protected readonly path = signal<string[]>([]);
  protected readonly loading = signal(false);
  protected readonly via = signal<Via>('built-in');
  protected readonly wins = signal(readWins());
  protected readonly scene = computed<Scene | undefined>(() => this.story()?.scenes.find(s => s.id === this.at()));

  protected async start(theme: string) {
    theme = theme.trim().slice(0, 80);
    if (!theme) return;
    const signal = this.fresh();
    this.loading.set(true);
    const raw = await this.ai.json(STORY_SYSTEM, STORY_SCHEMA, `Theme (from a visitor): """${theme}"""\n${this.lang.note()}`, signal, RESERVE);
    if (signal.aborted) return;
    const story = cleanStory(raw);
    this.via.set(story ? (this.ai.lastVia === 'device' ? 'device' : 'gemini') : 'built-in');
    this.story.set(story ?? BUILT_IN_STORY);
    this.loading.set(false);
    this.replay();
  }

  protected replay() {
    const first = this.story()?.scenes[0];
    if (!first) return;
    this.path.set([]);
    this.at.set(first.id);
    this.os.react(first.mood, 1800);
  }

  protected go(next: string) {
    const s = this.story()?.scenes.find(x => x.id === next);
    if (!s) return;
    this.path.update(p => [...p, next]);
    this.at.set(next);
    this.os.react(s.mood, 2000);
    if (s.ending === 'win') {
      const n = this.wins() + 1;
      this.wins.set(n);
      try { localStorage.setItem(WINS_KEY, String(n)); } catch { /* storage unavailable */ }
      this.notes.add({ icon: 'trophy', title: 'Incident resolved', text: `${this.story()!.title}: solved in ${this.path().length} choices.` });
    }
  }
}
function readWins() { try { return Number(localStorage.getItem(WINS_KEY)) || 0; } catch { return 0; } }

// ═════════════════════ Mind reader ═════════════════════

const MAX_QUESTIONS = 14;

@Component({
  selector: 'app-mind', changeDetection: ChangeDetectionStrategy.OnPush, imports: [Icon, Robot],
  template: `
    <div class="two"><app-robot [mood]="mood()" /><div class="grid">
      <p class="say" aria-live="polite">{{ saying() }}</p>
      @if (phase() !== 'intro') {
        <div class="meter" role="img" [attr.aria-label]="pool().length + ' of ' + total + ' skills still possible'"><span [style.width.%]="100 * pool().length / total"></span></div>
        <span class="via">{{ pool().length }} of {{ total }} skills still possible · question {{ asked().length }}</span>
      }
    </div></div>

    @switch (phase()) {
      @case ('intro') {
        <div class="row"><button type="button" class="btn btn-primary" (click)="start()"><app-icon name="play" [size]="14" /> I have one in mind</button><button type="button" class="btn btn-ghost" (click)="os.open('skills')">Show me his skills</button></div>
      }
      @case ('ask') {
        <div class="row" role="group" aria-label="Your answer">
          <button type="button" class="btn btn-primary" (click)="answer(true)">Yes</button>
          <button type="button" class="btn btn-ghost" (click)="answer(false)">No</button>
          <button type="button" class="btn btn-ghost" (click)="answer(null)">Not sure</button>
        </div>
      }
      @case ('guess') {
        <div class="row" role="group" aria-label="Was ALPHA right?">
          <button type="button" class="btn btn-primary" (click)="verdict(true)">Yes, that's it!</button>
          <button type="button" class="btn btn-ghost" (click)="verdict(false)">No</button>
        </div>
      }
      @case ('reveal') {
        <form (submit)="$event.preventDefault(); reveal(box.value)">
          <input #box maxlength="40" placeholder="Which skill was it?" aria-label="The skill you were thinking of" autocomplete="off" />
          <button type="submit" class="btn btn-primary">Tell ALPHA</button>
        </form>
      }
      @default { <div class="row"><button type="button" class="btn btn-primary" (click)="start()"><app-icon name="refresh" [size]="13" /> Play again</button></div> }
    }

    @if (phase() !== 'intro') {
      <details class="think" [open]="thoughts().length > 0">
        <summary>ALPHA's reasoning</summary>
        <ol>@for (t of thoughts(); track $index) { <li>{{ t }}</li> }</ol>
        @if (pool().length <= 6 && pool().length > 0) { <p class="via">Shortlist: {{ shortlist() }}</p> }
      </details>
    }
  `,
  styles: [SHARED, `
    .grid { display: grid; gap: 8px; min-width: 0; }
    .meter { height: 6px; border-radius: 999px; background: var(--line); overflow: hidden; }
    .meter span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--accent), var(--violet)); transition: width 0.5s ease; }
    .think { border: 1px solid var(--line-2); border-radius: 14px; padding: 10px 14px; background: var(--glass-2); }
    .think summary { cursor: pointer; font-size: 0.84rem; color: var(--ink-2); }
    .think ol { margin: 8px 0 0; padding-left: 20px; display: grid; gap: 4px; font: 0.78rem/1.45 var(--mono); color: var(--ink-2); }`],
})
export class MindReaderView {
  protected readonly os = inject(OsService);
  protected readonly total = SUSPECTS.length;
  protected readonly phase = signal<'intro' | 'ask' | 'guess' | 'reveal' | 'won' | 'over'>('intro');
  protected readonly pool = signal<Suspect[]>(SUSPECTS);
  protected readonly asked = signal<{ q: Question; said: boolean | null }[]>([]);
  protected readonly thoughts = signal<string[]>([]);
  protected readonly saying = signal(`Think of one of Kishore's ${SUSPECTS.length} skills. Keep it secret. I will find it with yes or no questions.`);
  protected readonly mood = signal<Mood>('wink');
  protected readonly shortlist = computed(() => this.pool().map(s => s.name).join(', '));
  private current: Question | null = null;
  private guessing: Suspect | null = null;

  protected start() {
    this.pool.set(SUSPECTS); this.asked.set([]); this.thoughts.set([]);
    this.next();
  }

  private think(t: string) { this.thoughts.update(x => [...x, t]); }

  private next() {
    const pool = this.pool();
    if (!pool.length) { this.giveUp(); return; }
    const best = pool.length > 1 && this.asked().length < MAX_QUESTIONS ? bestQuestion(pool, new Set(this.asked().map(a => a.q.key))) : null;
    if (!best) { this.guess(pool[0]); return; }
    this.current = best.q;
    this.think(`${pool.length} left. Best split: “${best.q.text}” → ${best.yes} yes / ${pool.length - best.yes} no.`);
    this.saying.set(best.q.text);
    this.mood.set(this.asked().length % 2 ? 'listen' : 'talk');
    this.phase.set('ask');
  }

  protected answer(said: boolean | null) {
    const q = this.current;
    if (!q) return;
    this.asked.update(a => [...a, { q, said }]);
    if (said === null) this.think('Not sure, so I keep everyone and try another angle.');
    else {
      const before = this.pool().length;
      this.pool.update(p => p.filter(s => q.test(s) === said));
      this.think(`Answer ${said ? 'yes' : 'no'}: ruled out ${before - this.pool().length}.`);
    }
    this.next();
  }

  private guess(s: Suspect) {
    this.guessing = s;
    this.think(this.pool().length === 1 ? `Only ${s.name} fits everything.` : `I am out of good questions. Best bet: ${s.name}.`);
    this.saying.set(`I think it is… ${s.name}! Am I right?`);
    this.mood.set('wow');
    this.phase.set('guess');
  }

  protected verdict(right: boolean) {
    const s = this.guessing;
    if (!s) return;
    if (right) {
      const n = this.asked().length;
      this.saying.set(`Got it in ${n} question${n === 1 ? '' : 's'}! ${s.name}${s.projects.length ? `, which he used in ${s.projects[0]}` : ''}.`);
      this.mood.set('party'); this.os.react('party', 2400);
      this.phase.set('won');
      return;
    }
    this.pool.update(p => p.filter(x => x !== s));
    this.think(`Not ${s.name}. Crossing it off.`);
    this.next();
  }

  private giveUp() {
    this.saying.set('You beat me! Nothing fits your answers. Which skill was it?');
    this.mood.set('dizzy');
    this.phase.set('reveal');
  }

  protected reveal(name: string) {
    const s = findSuspect(name);
    this.phase.set('over');
    if (!s) { this.saying.set(`“${name.trim() || '…'}” is not in Kishore's skill list. Sneaky! Pick one from the Skills app next time.`); this.mood.set('angry'); return; }
    const wrong = this.asked().find(a => a.said !== null && a.q.test(s) !== a.said);
    this.saying.set(wrong
      ? `Ah, ${s.name}! But you said “${wrong.said ? 'yes' : 'no'}” to “${wrong.q.text}”, and the site says ${wrong.said ? 'no' : 'yes'}. That threw me off.`
      : `Ah, ${s.name}! I should have asked one more question. You win this round.`);
    this.mood.set(wrong ? 'giggle' : 'sad');
  }
}

// ═════════════════════ the app ═════════════════════

/** AI Playground: small games where ALPHA plans and acts. Each round uses at most one AI request, and all of them work without AI. */
@Component({
  selector: 'app-playground',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, MissionView, AdventureView, MindReaderView, Arcade],
  template: `
    <div class="inner">
      @if (now(); as g) {
        <div class="top"><button type="button" class="btn sm" (click)="game.set(null)"><app-icon name="grid" [size]="14" /> All games</button><h2>{{ g.title }}</h2></div>
        @switch (g.id) {
          @case ('mission') { <app-mission /> }
          @case ('adventure') { <app-adventure /> }
          @case ('mind') { <app-mind /> }
          @default { <app-arcade /> }
        }
      } @else {
        <p class="lead">Games where ALPHA thinks, plans and acts. <span class="ai" [class.on]="aiReady()">{{ aiReady() ? 'AI is ready' : 'AI is resting: built-in versions' }}</span></p>
        <ul class="menu">
          @for (g of games; track g.id) {
            <li><button type="button" [style.--c]="g.color" (click)="game.set(g.id)"><span class="gi"><app-icon [name]="g.icon" [size]="24" /></span><b>{{ g.title }}</b><small>{{ g.text }}</small></button></li>
          }
        </ul>
        <p class="note">Each round uses at most one AI request. Mission Control can only use safe desktop actions, and Undo puts everything back.</p>
        <h3 class="sec">Quick games <small>best scores stay in this browser</small></h3>
        <ul class="menu quick">
          @for (g of quick; track g.id) {
            <li><button type="button" [style.--c]="g.color" (click)="game.set(g.id)"><span class="gi"><app-icon [name]="g.icon" [size]="22" /></span><b>{{ g.title }}</b><small>{{ g.text }}</small></button></li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .inner { padding: 20px 24px 28px; }
    .lead { color: var(--ink-2); margin: 0 0 14px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .ai { font: 0.72rem var(--mono); padding: 3px 9px; border-radius: 999px; border: 1px solid var(--line-2); color: var(--ink-3); } .ai.on { color: var(--teal); border-color: color-mix(in srgb, var(--teal) 50%, transparent); }
    .top { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; } .top h2 { font-size: 1.25rem; } .sm { padding: 7px 13px; font-size: 0.82rem; }
    .menu { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; } .menu li { display: grid; }
    .menu button { display: grid; justify-items: center; align-content: start; gap: 8px; padding: 20px 12px; border-radius: 18px; border: 1px solid var(--line-2); background: linear-gradient(160deg, color-mix(in srgb, var(--c) 24%, transparent), transparent 70%), var(--glass-2); color: var(--ink); cursor: pointer; text-align: center; transition: transform 0.2s, border-color 0.2s; }
    .menu button:hover { transform: translateY(-3px); border-color: var(--c); }
    .gi { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 16px; color: #fff; background: var(--c); box-shadow: 0 10px 24px -10px var(--c); }
    .menu b { font-size: 0.98rem; } .menu small { color: var(--ink-2); font-size: 0.8rem; line-height: 1.4; }
    .note { margin-top: 16px; font-size: 0.78rem; color: var(--ink-3); }
    .sec { margin: 26px 0 12px; font-size: 1.02rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; } .sec small { font: 0.72rem var(--mono); color: var(--ink-3); font-weight: 400; }
    .quick .gi { width: 46px; height: 46px; border-radius: 14px; } .quick button { padding: 16px 10px; gap: 6px; } .quick b { font-size: 0.92rem; } .quick small { font-size: 0.76rem; }
    @media (max-width: 700px) { .menu { grid-template-columns: 1fr; } .menu button { grid-template-columns: auto 1fr; justify-items: start; text-align: left; align-items: center; } .menu small { grid-column: 2; } .gi { grid-row: span 2; } }
    @media (max-width: 760px) { .inner { padding: 16px 14px 190px; } }
  `,
})
export class Playground {
  private cloud = inject(CloudService);
  protected readonly games = PLAY_GAMES;
  protected readonly quick = GAMES;
  /** shared with the terminal and Spotlight, so they can open a game directly */
  protected readonly game = inject(ArcadeState).game;
  protected readonly now = computed(() => [...PLAY_GAMES, ...GAMES].find(g => g.id === this.game()) ?? null);
  protected readonly aiReady = signal(this.cloud.remaining() > RESERVE);
}
