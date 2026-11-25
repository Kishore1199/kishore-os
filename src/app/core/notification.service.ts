import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { dayKey } from '../lab/games';
import { OfflineService } from './offline.service';
import { OsService } from './os.service';
import { SessionService } from './session.service';
import { VisitorMemory } from './visitor-memory.service';

export interface Note { id: string; icon: string; title: string; text: string; at: number; action?: string; run?: () => void; read: boolean; }
const TIPS: [string, string][] = [
  ['Two windows at once', 'Tell ALPHA “put projects next to skills”, or “tile everything”.'],
  ['Ask in the Terminal', 'Type a question in plain English, such as “where did he use Docker”.'],
  ['Spotlight answers too', 'Press Ctrl K, type a question and press Enter.'],
  ['Select and ask', 'Select any text in a window and press “Ask ALPHA”.'],
  ['ALPHA can walk', 'Say “walk around” and ALPHA goes for a walk along the dock.'],
];
const MAX = 20;

/** ALPHA's notification centre. Nothing leaves the browser, and it never uses the browser's own notifications. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private os = inject(OsService);
  private session = inject(SessionService);
  private offline = inject(OfflineService);
  private memory = inject(VisitorMemory);
  readonly open = signal(false);
  readonly notes = signal<Note[]>([]);
  readonly unread = computed(() => this.notes().filter(n => !n.read).length);
  private n = 0;

  constructor() {
    this.daily();
    const [title, text] = TIPS[new Date().getDate() % TIPS.length];
    this.add({ icon: 'spark', title, text });
    const last = this.session.last();
    if (last.length && !this.session.restored) this.add({ icon: 'refresh', title: 'Your last windows', text: `You had ${last.length} window${last.length > 1 ? 's' : ''} open last time.`, action: 'Restore', run: () => this.os.restore(last) });
    effect(() => { if (this.offline.canInstall()) untracked(() => this.add({ icon: 'download', title: 'Install Kishore.OS', text: 'Use it as an app, also without internet.', action: 'Install', run: () => void this.offline.install() })); });
    this.os.onNotify.add(m => this.add({ icon: 'check', title: 'Kishore.OS', text: m, read: true }));
  }

  private daily() {
    let streak: { day?: string; streak?: number } | null = null;
    if (this.memory.on()) try { streak = JSON.parse(localStorage.getItem('kv-daily') ?? 'null'); } catch { /* unreadable */ }
    if (streak?.day === dayKey()) return;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const going = streak?.day === dayKey(y) && (streak.streak ?? 0) > 0;
    this.add({ icon: 'calendar', title: 'Daily challenge', text: going ? `Keep your streak of ${streak!.streak} going: today's question is ready.` : "Today's interview question is ready.", action: 'Play', run: () => this.os.openTool('daily') });
  }

  add(x: Omit<Note, 'id' | 'at' | 'read'> & { read?: boolean }) {
    this.notes.update(ns => [{ read: false, ...x, id: `n${++this.n}`, at: Date.now() }, ...ns].slice(0, MAX));
  }
  toggle() {
    this.open.update(o => !o);
    if (this.open()) this.notes.update(ns => ns.map(n => ({ ...n, read: true })));
  }
  act(n: Note) {
    this.open.set(false);
    this.dismiss(n);
    n.run?.();
  }
  dismiss(n: Note) {
    this.notes.update(ns => ns.filter(x => x.id !== n.id));
  }
  clear() {
    this.notes.set([]);
  }
}
