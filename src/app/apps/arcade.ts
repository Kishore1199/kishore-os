import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { Icon } from '../core/icon';
import { SkillIcon } from '../core/skill-icon';

interface Bug { id: number; x: number; y: number; dead: boolean; }
interface Tile { id: number; name: string; color: string; open: boolean; done: boolean; }

const TECH = [
  { name: 'Java', color: '#ED8B00' }, { name: 'Spring Boot', color: '#6DB33F' }, { name: 'Angular', color: '#DD0031' }, { name: 'TypeScript', color: '#3178C6' },
  { name: 'MySQL', color: '#4479A1' }, { name: 'MongoDB', color: '#47A248' }, { name: 'Docker', color: '#2496ED' }, { name: 'Hibernate', color: '#BCAE79' },
];
const best = (k: string) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const save = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* ignore */ } };

@Component({
  selector: 'app-arcade',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, SkillIcon],
  template: `
    <div class="inner">
          <div class="tabs">
            <button type="button" [class.on]="game() === 'bugs'" (click)="switchTo('bugs')"><app-icon name="bug" [size]="15" /> Bug squash</button>
            <button type="button" [class.on]="game() === 'match'" (click)="switchTo('match')"><app-icon name="layers" [size]="15" /> Stack match</button>
          </div>

          @if (game() === 'bugs') {
            <div class="hud mono">
              <span>score <b>{{ score() }}</b></span><span>time <b>{{ left() }}s</b></span><span><app-icon name="trophy" [size]="13" /> best <b>{{ bugBest() }}</b></span>
            </div>
            <div class="arena" [class.idle]="!running()">
              @for (b of bugs(); track b.id) {
                <button type="button" class="bug" [class.dead]="b.dead" [style.left.%]="b.x" [style.top.%]="b.y" (click)="squash(b)" aria-label="Squash bug"><app-icon name="bug" [size]="26" /></button>
              }
              @if (!running()) {
                <div class="start">
                  @if (played()) { <p class="big">{{ score() }} bugs squashed{{ score() >= bugBest() && score() > 0 ? ' — new best!' : '' }}</p> }
                  <p>Production is on fire. Squash as many bugs as you can in 20 seconds.</p>
                  <button type="button" class="btn hot" (click)="startBugs()"><app-icon name="play" [size]="14" /> {{ played() ? 'Play again' : 'Start' }}</button>
                </div>
              }
            </div>
          } @else {
            <div class="hud mono">
              <span>moves <b>{{ moves() }}</b></span><span>pairs <b>{{ pairs() }}/8</b></span><span><app-icon name="trophy" [size]="13" /> best <b>{{ matchBest() || '—' }}</b></span>
              <button type="button" class="reset" (click)="newMatch()"><app-icon name="refresh" [size]="13" /> shuffle</button>
            </div>
            <div class="board">
              @for (t of tiles(); track t.id) {
                <button type="button" class="tile" [class.open]="t.open || t.done" [class.done]="t.done" (click)="flip(t)" [attr.aria-label]="t.open || t.done ? t.name : 'Hidden tile'">
                  <span class="back"><app-icon name="code" [size]="20" /></span>
                  <span class="front" [style.--c]="t.color"><app-skill-icon [name]="t.name" [color]="t.color" [size]="30" /><small>{{ t.name }}</small></span>
                </button>
              }
            </div>
            @if (pairs() === 8) { <p class="win mono">Stack assembled in {{ moves() }} moves{{ moves() <= matchBest() ? ' — new best!' : '' }}</p> }
          }
        </div>
  `,
  styles: `
    .inner { padding: 20px 24px 28px; }
    .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
    .tabs button { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 999px; border: 1px solid var(--line-2); background: none; cursor: pointer; font-weight: 600; font-size: 0.86rem; }
    .tabs button.on { background: var(--accent); border-color: var(--accent); color: #fff; }
    .hud { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 12px; font-size: 0.82rem; color: var(--ink-2); }
    .hud b { color: var(--ink); font-size: 1rem; }
    .hud span { display: inline-flex; align-items: center; gap: 6px; }
    .reset { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line-2); background: none; cursor: pointer; font: inherit; }
    .arena { position: relative; height: 380px; border-radius: 20px; overflow: hidden; border: 1px solid var(--line-2);
      background: radial-gradient(var(--line-2) 1px, transparent 1px) 0 0 / 22px 22px, color-mix(in srgb, var(--solid) 50%, transparent); }
    .bug { position: absolute; width: 50px; height: 50px; margin: -25px 0 0 -25px; border-radius: 50%; border: 0; cursor: crosshair; display: grid; place-items: center;
      color: #fff; background: radial-gradient(circle at 40% 35%, #fb7185, #be123c); box-shadow: 0 8px 18px -6px #be123c; animation: pop 0.25s ease-out; }
    .bug.dead { background: var(--teal); box-shadow: none; animation: squash 0.3s forwards; pointer-events: none; }
    @keyframes pop { from { transform: scale(0); } }
    @keyframes squash { to { transform: scale(1.6); opacity: 0; } }
    .start { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 14px; text-align: center; padding: 20px; color: var(--ink-2); }
    .big { font: 800 1.8rem 'Bricolage Grotesque', sans-serif; color: var(--ink); }
    .board { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; max-width: 520px; margin: 0 auto; }
    .tile { position: relative; aspect-ratio: 1; padding: 0; border: 0; background: none; cursor: pointer; perspective: 600px; }
    .tile span { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 6px; border-radius: 16px; backface-visibility: hidden; transition: transform 0.45s ease; }
    .back { background: linear-gradient(135deg, var(--violet), var(--accent)); color: rgba(255,255,255,0.8); }
    .front { background: var(--solid); border: 1px solid var(--line-2); transform: rotateY(180deg); }
    .front small { font-size: 0.66rem; font-weight: 600; color: var(--ink-2); }
    .tile.open .back { transform: rotateY(-180deg); }
    .tile.open .front { transform: rotateY(0); }
    .tile.done .front { border-color: var(--c); box-shadow: inset 0 0 0 2px var(--c); }
    .win { text-align: center; margin-top: 14px; color: var(--teal); }
    @media (max-width: 520px) { .arena { height: 320px; } }
  `,
})
export class Arcade implements OnDestroy {
  protected readonly game = signal<'bugs' | 'match'>('bugs');

  // ── bug squash ──
  protected readonly bugs = signal<Bug[]>([]);
  protected readonly score = signal(0);
  protected readonly left = signal(20);
  protected readonly running = signal(false);
  protected readonly played = signal(false);
  protected readonly bugBest = signal(best('kv-bugs'));
  private spawnT?: ReturnType<typeof setInterval>;
  private clockT?: ReturnType<typeof setInterval>;
  private nextId = 0;

  protected startBugs() {
    this.stopBugs();
    this.score.set(0); this.left.set(20); this.bugs.set([]); this.running.set(true); this.played.set(true);
    this.spawnT = setInterval(() => this.spawn(), 520);
    this.clockT = setInterval(() => {
      this.left.update(n => n - 1);
      if (this.left() <= 0) this.endBugs();
    }, 1000);
  }
  private spawn() {
    const id = this.nextId++;
    this.bugs.update(b => [...b.filter(x => !x.dead).slice(-6), { id, x: 8 + Math.random() * 84, y: 10 + Math.random() * 80, dead: false }]);
    setTimeout(() => this.bugs.update(b => b.filter(x => x.id !== id || x.dead)), 1150 - Math.min(this.score() * 12, 450));
  }
  protected squash(b: Bug) {
    if (!this.running() || b.dead) return;
    this.score.update(n => n + 1);
    this.bugs.update(list => list.map(x => (x.id === b.id ? { ...x, dead: true } : x)));
    setTimeout(() => this.bugs.update(list => list.filter(x => x.id !== b.id)), 300);
  }
  private endBugs() {
    this.stopBugs();
    this.running.set(false);
    this.bugs.set([]);
    if (this.score() > this.bugBest()) { this.bugBest.set(this.score()); save('kv-bugs', this.score()); }
  }
  private stopBugs() {
    clearInterval(this.spawnT);
    clearInterval(this.clockT);
  }

  // ── stack match ──
  protected readonly tiles = signal<Tile[]>([]);
  protected readonly moves = signal(0);
  protected readonly pairs = signal(0);
  protected readonly matchBest = signal(best('kv-match'));
  private busy = false;

  protected newMatch() {
    const deck = [...TECH, ...TECH].map((t, i) => ({ id: i, name: t.name, color: t.color, open: false, done: false }));
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    this.tiles.set(deck); this.moves.set(0); this.pairs.set(0); this.busy = false;
  }
  protected flip(t: Tile) {
    if (this.busy || t.open || t.done) return;
    this.tiles.update(list => list.map(x => (x.id === t.id ? { ...x, open: true } : x)));
    const open = this.tiles().filter(x => x.open && !x.done);
    if (open.length < 2) return;
    this.moves.update(n => n + 1);
    const [a, b] = open;
    if (a.name === b.name) {
      this.tiles.update(list => list.map(x => (x.id === a.id || x.id === b.id ? { ...x, done: true, open: false } : x)));
      this.pairs.update(n => n + 1);
      if (this.pairs() === 8 && (!this.matchBest() || this.moves() < this.matchBest())) { this.matchBest.set(this.moves()); save('kv-match', this.moves()); }
    } else {
      this.busy = true;
      setTimeout(() => { this.tiles.update(list => list.map(x => (x.done ? x : { ...x, open: false }))); this.busy = false; }, 750);
    }
  }

  protected switchTo(g: 'bugs' | 'match') {
    this.endBugs();
    this.played.set(false);
    this.game.set(g);
    if (g === 'match' && !this.tiles().length) this.newMatch();
  }

  ngOnDestroy() {
    this.stopBugs();
  }
}
