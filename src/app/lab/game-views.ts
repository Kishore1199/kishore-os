import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { AssistantBus } from '../core/assistant.bus';
import { CHAPTERS, NotesService, chapter } from '../core/notes.service';
import { VisitorMemory } from '../core/visitor-memory.service';
import { Mood, Robot } from '../layout/robot';
import { Hand, HANDS, MYSTERIES, Mystery, RACE_SPEEDS, SNIPPETS, Streak, alphaHand, beats, correctPrefix, dayKey, mystery, nextStreak, sameSkill, seeded, wpm } from './games';
import { QuizItem, notesQuiz } from './quiz';

const SHARED = `
    :host { display: grid; gap: 14px; min-width: 0; } p, label { font-size: 0.9rem; color: var(--text-2); } b { color: var(--text); } small { font-size: 0.78rem; color: var(--text-2); }
    .two { display: grid; grid-template-columns: auto 1fr; gap: 22px; align-items: center; } .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; } .btn { padding: 9px 16px; font-size: 0.86rem; }
    input { width: 100%; padding: 12px 14px; font: inherit; font-size: 0.9rem; color: var(--text); background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 14px; } input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    ol { margin: 0; padding-left: 20px; display: grid; gap: 5px; font-size: 0.9rem; color: var(--text-2); } .big { font: 700 1.5rem 'Space Grotesk', sans-serif; color: var(--text); } .say { padding: 10px 14px; border-radius: 4px 16px 16px 16px; background: var(--surface-2); border: 1px solid var(--border); font-size: 0.92rem; color: var(--text); }
    @media (max-width: 560px) { .two { grid-template-columns: 1fr; justify-items: center; text-align: center; } .row { justify-content: center; } ol { text-align: left; } }`;

@Component({
  selector: 'app-detective', changeDetection: ChangeDetectionStrategy.OnPush, imports: [Robot],
  template: `
    <div class="two"><app-robot [mood]="mood()" />
      <div><p class="say" aria-live="polite">{{ line() }}</p>
        <ol>@for (c of shown(); track c) { <li>{{ c }}</li> }</ol></div></div>
    @if (!over()) {
      <label for="dg">Your guess</label><input #box id="dg" type="text" autocomplete="off" maxlength="40" placeholder="Type a technology" (keydown.enter)="guess(box)" />
      <div class="row"><button type="button" class="btn btn-primary" (click)="guess(box)">Guess</button>@if (clue() < secret().clues.length) { <button type="button" class="btn btn-ghost" (click)="more()">Another clue</button> }<button type="button" class="btn btn-ghost" (click)="giveUp()">Give up</button></div>
    } @else { <div class="row"><button type="button" class="btn btn-primary" (click)="next()">Next mystery</button></div> }
    <small>Score {{ score() }} · solved {{ solved() }} of {{ played() }} · {{ total }} skills to find</small>`,
  styles: [SHARED],
})
export class DetectiveView {
  protected readonly total = MYSTERIES;
  protected readonly secret = signal<Mystery>(mystery());
  protected readonly clue = signal(1);
  protected readonly over = signal(false);
  protected readonly mood = signal<Mood>('cool');
  protected readonly line = signal("I'm thinking of a technology Kishore really used. Can you guess it?");
  protected readonly score = signal(0);
  protected readonly solved = signal(0);
  protected readonly played = signal(0);
  protected readonly shown = computed(() => this.secret().clues.slice(0, this.clue()));
  private seen: string[] = [];

  protected more() { this.clue.update(c => c + 1); this.mood.set('listen'); }
  protected guess(box: HTMLInputElement) {
    const g = box.value.trim();
    if (!g || this.over()) return;
    box.value = '';
    if (sameSkill(g, this.secret().name)) {
      const pts = Math.max(1, 6 - this.clue());
      this.score.update(s => s + pts); this.solved.update(s => s + 1);
      this.end(`Yes, it's ${this.secret().name}! ${pts} point${pts > 1 ? 's' : ''}.`, 'party');
    } else if (this.clue() >= this.secret().clues.length) this.end(`Not ${g}. It was ${this.secret().name}.`, 'sad');
    else { this.more(); this.line.set(`Not ${g}. Here's another clue.`); this.mood.set('giggle'); }
  }
  protected giveUp() { this.end(`It was ${this.secret().name}.`, 'shy'); }
  private end(text: string, mood: Mood) { this.over.set(true); this.played.update(p => p + 1); this.line.set(text); this.mood.set(mood); this.clue.set(this.secret().clues.length); }
  protected next() {
    this.seen = [...this.seen, this.secret().name].slice(-(MYSTERIES - 3));
    this.secret.set(mystery(this.seen)); this.clue.set(1); this.over.set(false); this.mood.set('cool'); this.line.set('Here comes another one.');
  }
}

const ICON: Record<Hand, string> = { rock: '✊', paper: '✋', scissors: '✌️' };
@Component({
  selector: 'app-rps', changeDetection: ChangeDetectionStrategy.OnPush, imports: [Robot],
  template: `
    <div class="two"><app-robot [mood]="mood()" />
      <div><p class="say" aria-live="polite">{{ line() }}</p>@if (last(); as l) { <p class="big">You {{ icon[l.you] }} {{ icon[l.me] }} Me</p> <small>My move was {{ l.why }}.</small> }</div></div>
    <div class="row">@for (h of hands; track h) { <button type="button" class="btn btn-ghost" [disabled]="busy()" (click)="play(h)">{{ icon[h] }} {{ h }}</button> }</div>
    <small>You {{ you() }} · ALPHA {{ me() }} · draws {{ draws() }}. I learn your habits as we play.</small>`,
  styles: [SHARED],
})
export class RpsView implements OnDestroy {
  protected readonly hands = HANDS;
  protected readonly icon = ICON;
  protected readonly mood = signal<Mood>('happy');
  protected readonly line = signal('Rock, paper, scissors! Choose your move.');
  protected readonly last = signal<{ you: Hand; me: Hand; why: string } | null>(null);
  protected readonly you = signal(0);
  protected readonly me = signal(0);
  protected readonly draws = signal(0);
  protected readonly busy = signal(false);
  private history: Hand[] = [];
  private t?: ReturnType<typeof setTimeout>;

  protected play(h: Hand) {
    if (this.busy()) return;
    this.busy.set(true);
    const mine = alphaHand(this.history); // decided before looking at this move
    this.history.push(h);
    this.mood.set('listen'); this.line.set('Rock… paper… scissors…');
    this.t = setTimeout(() => {
      this.last.set({ you: h, me: mine.hand, why: mine.why });
      if (h === mine.hand) { this.draws.update(n => n + 1); this.line.set('A draw! Great minds think alike.'); this.mood.set('wink'); }
      else if (beats(h, mine.hand)) { this.you.update(n => n + 1); this.line.set('You win this one!'); this.mood.set('sad'); }
      else { this.me.update(n => n + 1); this.line.set('I win! Again?'); this.mood.set('party'); }
      this.busy.set(false);
    }, 700);
  }
  ngOnDestroy() { clearTimeout(this.t); }
}

@Component({
  selector: 'app-race', changeDetection: ChangeDetectionStrategy.OnPush, imports: [Robot],
  template: `
    <div class="two"><app-robot [mood]="mood()" />
      <div><p class="say" aria-live="polite">{{ line() }}</p>
        <div class="row" role="group" aria-label="ALPHA's speed">@for (s of speeds; track s) { <button type="button" class="btn btn-ghost" [attr.aria-pressed]="speed() === s" [disabled]="running()" (click)="speed.set(s)">{{ s }}</button> }</div></div></div>
    <div class="track"><span>You</span><i [style.width.%]="pct()"></i></div><div class="track me"><span>ALPHA</span><i [style.width.%]="alpha()"></i></div>
    <pre aria-label="Code to type"><span class="ok">{{ target().slice(0, done()) }}</span><span [class.bad]="typed().length > done()">{{ target().slice(done(), done() + 1) }}</span>{{ target().slice(done() + 1) }}</pre>
    <label for="tr">Type the {{ snippet().lang }} line above. The clock starts with your first key.</label>
    <input #box id="tr" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" [disabled]="finished()" (input)="type(box.value)" (paste)="$event.preventDefault()" />
    <div class="row"><button type="button" class="btn btn-primary" (click)="again(box)">{{ finished() ? 'Race again' : 'New line' }}</button><small>Best {{ best() }} WPM</small></div>`,
  styles: [SHARED, `pre { margin: 0; padding: 14px; border: 1px solid var(--border); border-radius: 14px; background: var(--bg-2); color: var(--text-2); font: 0.84rem/1.6 'JetBrains Mono', monospace; white-space: pre-wrap; overflow-wrap: anywhere; } .ok { color: var(--text); background: rgba(16, 185, 129, 0.2); } .bad { color: #fff; background: #dc2626; }
    .track { position: relative; height: 26px; border-radius: 9px; border: 1px solid var(--border-strong); overflow: hidden; } .track i { position: absolute; inset: 0 auto 0 0; background: rgba(16, 185, 129, 0.45); transition: width 0.15s linear; } .track.me i { background: rgba(59, 130, 246, 0.45); } .track span { position: relative; z-index: 1; padding: 0 10px; font-size: 0.78rem; line-height: 25px; color: var(--text); } button[aria-pressed='true'] { border-color: var(--accent); color: var(--accent); }`],
})
export class RaceView implements OnDestroy {
  protected readonly speeds = Object.keys(RACE_SPEEDS) as (keyof typeof RACE_SPEEDS)[];
  protected readonly speed = signal<keyof typeof RACE_SPEEDS>('Normal');
  protected readonly snippet = signal(SNIPPETS[0]);
  protected readonly target = computed(() => this.snippet().text);
  protected readonly typed = signal('');
  protected readonly done = computed(() => correctPrefix(this.typed(), this.target()));
  protected readonly pct = computed(() => (this.done() / this.target().length) * 100);
  protected readonly alpha = signal(0);
  protected readonly running = signal(false);
  protected readonly finished = signal(false);
  protected readonly best = signal(0);
  protected readonly mood = signal<Mood>('cool');
  protected readonly line = signal('Ready to race? I type too.');
  private started = 0;
  private timer?: ReturnType<typeof setInterval>;

  protected type(v: string) {
    if (this.finished()) return;
    if (!this.running() && v) {
      this.running.set(true); this.started = performance.now(); this.mood.set('happy'); this.line.set('Go go go!');
      const perMs = (RACE_SPEEDS[this.speed()] * 5) / 60000;
      this.timer = setInterval(() => { this.alpha.set(Math.min(100, ((performance.now() - this.started) * perMs * 100) / this.target().length)); if (this.alpha() >= 100) this.end(false); }, 80);
    }
    this.typed.set(v);
    if (v === this.target()) this.end(true);
  }
  private end(won: boolean) {
    if (this.finished()) return;
    clearInterval(this.timer);
    const speed = wpm(this.done(), performance.now() - this.started);
    this.finished.set(true); this.running.set(false);
    if (won) this.best.update(b => Math.max(b, speed));
    this.line.set(won ? `You win at ${speed} words per minute!` : `I finished first. You were at ${speed} words per minute.`);
    this.mood.set(won ? 'wow' : 'party');
  }
  protected again(box: HTMLInputElement) {
    clearInterval(this.timer);
    const others = SNIPPETS.filter(s => s !== this.snippet());
    this.snippet.set(others[Math.floor(Math.random() * others.length)]);
    this.typed.set(''); this.alpha.set(0); this.running.set(false); this.finished.set(false); this.mood.set('cool'); this.line.set('Ready when you are.');
    box.value = ''; box.disabled = false; box.focus();
  }
  ngOnDestroy() { clearInterval(this.timer); }
}

const MOVES: Mood[] = ['happy', 'wink', 'love', 'wow', 'cool', 'party', 'giggle', 'highfive', 'shy', 'dizzy', 'sad', 'angry', 'yawn', 'sleep', 'listen', 'talk'];
const PRESETS: { name: string; moves: Mood[] }[] = [
  { name: 'Happy dance', moves: ['happy', 'party', 'highfive', 'party', 'wow', 'party'] },
  { name: 'Drama', moves: ['shy', 'sad', 'angry', 'dizzy', 'love', 'happy'] },
  { name: 'Morning', moves: ['sleep', 'yawn', 'wow', 'happy', 'highfive'] },
];
@Component({
  selector: 'app-studio', changeDetection: ChangeDetectionStrategy.OnPush, imports: [Robot],
  template: `
    <div class="two"><app-robot [mood]="mood()" /><div><p class="say" aria-live="polite">{{ playing() ? 'Performing: ' + mood() : 'Tap moves to build a show, then press Play.' }}</p>
      <div class="row">@for (m of seq(); track $index) { <button type="button" class="chip" [class.now]="playing() && at() === $index" (click)="remove($index)" [attr.aria-label]="'Remove ' + m">{{ m }} ×</button> } @empty { <small>No moves yet.</small> }</div></div></div>
    <div class="row" role="group" aria-label="Moves">@for (m of moves; track m) { <button type="button" class="btn btn-ghost" [disabled]="seq().length >= 12" (click)="add(m)">{{ m }}</button> }</div>
    <div class="row" role="group" aria-label="Ready-made shows">@for (p of presets; track p.name) { <button type="button" class="btn btn-ghost" (click)="load(p.moves)">{{ p.name }}</button> }</div>
    <label for="sp">Speed</label><input id="sp" type="range" min="400" max="1600" step="100" [value]="2000 - ms()" (input)="ms.set(2000 - +$any($event.target).value)" />
    <div class="row"><button type="button" class="btn btn-primary" [disabled]="!seq().length" (click)="toggle()">{{ playing() ? 'Stop' : 'Play' }}</button><button type="button" class="btn btn-ghost" [disabled]="!seq().length" (click)="seq.set([])">Clear</button><button type="button" class="btn btn-ghost" [disabled]="!seq().length" (click)="send()">Perform on the page</button></div>`,
  styles: [SHARED, `.chip { cursor: pointer; } .chip.now { color: var(--bg); background: var(--text); } input { padding: 0; } .btn-ghost { text-transform: capitalize; }`],
})
export class StudioView implements OnDestroy {
  private bus = inject(AssistantBus);
  protected readonly moves = MOVES;
  protected readonly presets = PRESETS;
  protected readonly seq = signal<Mood[]>([]);
  protected readonly mood = signal<Mood>('idle');
  protected readonly playing = signal(false);
  protected readonly at = signal(0);
  protected readonly ms = signal(1000);
  private t?: ReturnType<typeof setTimeout>;

  protected add(m: Mood) { this.seq.update(s => [...s, m].slice(0, 12)); if (!this.playing()) this.mood.set(m); }
  protected remove(i: number) { this.seq.update(s => s.filter((_, j) => j !== i)); }
  protected load(m: Mood[]) { this.stop(); this.seq.set([...m]); this.toggle(); }
  protected toggle() { if (this.playing()) this.stop(); else { this.playing.set(true); this.step(0); } }
  private step(i: number) {
    const s = this.seq();
    if (i >= s.length) return this.stop();
    this.at.set(i); this.mood.set(s[i]);
    this.t = setTimeout(() => this.step(i + 1), this.ms());
  }
  private stop() { clearTimeout(this.t); this.playing.set(false); this.mood.set('idle'); }
  /** The corner robot performs once the dialog is closed. */
  protected send() { this.bus.perform(this.seq(), this.ms()); }
  ngOnDestroy() { clearTimeout(this.t); }
}

const DAILY = CHAPTERS.filter(c => c.questions >= 25);
const DAILY_KEY = 'kv-daily';
@Component({
  selector: 'app-daily', changeDetection: ChangeDetectionStrategy.OnPush, imports: [Robot],
  template: `
    <div class="two"><app-robot [mood]="mood()" /><div><p class="say" aria-live="polite">{{ line() }}</p><small>{{ today }} · streak {{ streak()?.streak ?? 0 }} · best {{ streak()?.best ?? 0 }}</small></div></div>
    @if (item(); as q) {
      <p><b>{{ q.question }}</b><br><small>{{ title() }}</small></p>
      <div class="opts">@for (o of q.options; track $index) { <button type="button" [class.right]="picked() !== null && $index === q.answer" [class.wrong]="picked() === $index && $index !== q.answer" [disabled]="picked() !== null" (click)="pick($index)">{{ o }}@if (picked() !== null && $index === q.answer) { <small> Correct</small> } @else if (picked() === $index) { <small> Your answer</small> }</button> }</div>
      @if (picked() !== null) { <p>{{ q.why }}</p><p><a [href]="url()" target="_blank" rel="noopener">Open the chapter</a> · Come back tomorrow for a new one.</p> }
    } @else if (error()) { <p role="alert">{{ error() }}</p> } @else { <p role="status">Choosing today's question…</p> }
    @if (!memory.on()) { <small>Your streak isn't saved, because you asked not to be remembered.</small> }`,
  styles: [SHARED, `.opts { display: grid; gap: 8px; } .opts button { text-align: left; padding: 11px 14px; border-radius: 12px; border: 1px solid var(--border-strong); background: none; color: var(--text-2); font: inherit; font-size: 0.88rem; cursor: pointer; overflow-wrap: anywhere; } .opts button:hover:enabled { border-color: var(--accent); } .right { border-color: #10b981 !important; color: var(--text) !important; background: rgba(16, 185, 129, 0.12) !important; } .wrong { border-color: #ef4444 !important; color: var(--text) !important; } a { color: var(--accent); }`],
})
export class DailyView implements OnInit {
  private notes = inject(NotesService);
  protected readonly memory = inject(VisitorMemory);
  protected readonly today = dayKey();
  protected readonly item = signal<QuizItem | null>(null);
  protected readonly picked = signal<number | null>(null);
  protected readonly streak = signal<Streak | null>(this.load());
  protected readonly error = signal('');
  protected readonly mood = signal<Mood>('listen');
  protected readonly line = signal('One question a day. Everyone gets the same one.');
  private readonly key = signal('');
  protected readonly title = computed(() => chapter(this.key())?.title ?? '');
  protected readonly url = computed(() => chapter(this.key())?.url ?? '');

  async ngOnInit() {
    const random = seeded(this.today);
    try {
      for (let i = 0; i < 5 && !this.item(); i++) {
        const c = DAILY[Math.floor(random() * DAILY.length)];
        const [q] = notesQuiz(await this.notes.notes(c.key), 1, random);
        if (q) { this.key.set(c.key); this.item.set(q); }
      }
      if (!this.item()) throw new Error('no question');
      const s = this.streak();
      if (s?.day === this.today) { this.picked.set(s.pick); this.line.set(s.right ? 'You already got today right!' : 'You already played today.'); this.mood.set(s.right ? 'happy' : 'wink'); }
    } catch { this.error.set('The question could not be loaded. Please check your connection.'); }
  }
  protected pick(i: number) {
    const q = this.item();
    if (!q || this.picked() !== null) return;
    this.picked.set(i);
    const s = nextStreak(this.streak(), this.today, i === q.answer, i);
    this.streak.set(s);
    if (this.memory.on()) { try { localStorage.setItem(DAILY_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } }
    this.line.set(s.right ? (s.streak > 1 ? `Correct! ${s.streak} days in a row!` : 'Correct! Your streak starts today.') : 'Not this time. Tomorrow is another chance.');
    this.mood.set(s.right ? 'party' : 'sad');
  }
  private load(): Streak | null {
    try { const v = JSON.parse(localStorage.getItem(DAILY_KEY) ?? 'null'); return v && typeof v.day === 'string' && typeof v.streak === 'number' && typeof v.pick === 'number' ? { day: v.day, right: v.right === true, pick: v.pick, streak: v.streak, best: Number(v.best) || 0 } : null; } catch { return null; }
  }
}
