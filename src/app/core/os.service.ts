import { Injectable, computed, signal } from '@angular/core';

export type AppId = 'about' | 'projects' | 'experience' | 'skills' | 'notes' | 'terminal' | 'contact' | 'games' | 'monitor' | 'resume' | 'guestbook';

export interface AppDef { id: AppId; title: string; icon: string; color: string; w: number; h: number; dock?: boolean; }

export const APPS: AppDef[] = [
  { id: 'about', title: 'About Me', icon: 'user', color: '#f97316', w: 760, h: 560, dock: true },
  { id: 'projects', title: 'Projects', icon: 'folder', color: '#3b82f6', w: 980, h: 640, dock: true },
  { id: 'experience', title: 'Experience', icon: 'briefcase', color: '#10b981', w: 820, h: 620, dock: true },
  { id: 'skills', title: 'Skills', icon: 'layers', color: '#a855f7', w: 900, h: 620, dock: true },
  { id: 'notes', title: 'Study Notes', icon: 'book-open', color: '#eab308', w: 940, h: 640, dock: true },
  { id: 'terminal', title: 'Terminal', icon: 'terminal', color: '#22c55e', w: 760, h: 480, dock: true },
  { id: 'contact', title: 'Contact', icon: 'mail', color: '#ec4899', w: 820, h: 600, dock: true },
  { id: 'guestbook', title: 'Guestbook', icon: 'message', color: '#f59e0b', w: 900, h: 640 },
  { id: 'games', title: 'Arcade', icon: 'gamepad', color: '#ef4444', w: 760, h: 600 },
  { id: 'monitor', title: 'System Monitor', icon: 'activity', color: '#06b6d4', w: 900, h: 640 },
  { id: 'resume', title: 'Resume.pdf', icon: 'file', color: '#64748b', w: 820, h: 700 },
];
export const appDef = (id: AppId) => APPS.find(a => a.id === id)!;

export interface Win { id: AppId; x: number; y: number; w: number; h: number; z: number; min: boolean; max: boolean; }

const TOP = 40; // menu bar height
const DOCK = 92; // space kept for the dock

/** Window manager for the desktop: open / focus / move / resize / minimise / maximise. */
@Injectable({ providedIn: 'root' })
export class OsService {
  readonly wins = signal<Win[]>([]);
  readonly booted = signal(false);
  readonly spotlight = signal(false);
  readonly toast = signal('');
  /** apps can override what ALPHA says for "explain this window" (e.g. the selected project) */
  readonly narrators = new Map<AppId, () => string>();
  /** ask ALPHA to pull a face: { mood, ms, n } — n changes on every call so repeats still fire */
  readonly emote = signal<{ mood: string; ms: number; n: number } | null>(null);
  private emoteN = 0;
  react(mood: string, ms = 1800) {
    this.emote.set({ mood, ms, n: ++this.emoteN });
  }
  private zTop = 10;
  private toastT?: ReturnType<typeof setTimeout>;

  readonly focused = computed(() => {
    const open = this.wins().filter(w => !w.min);
    return open.length ? open.reduce((a, b) => (a.z > b.z ? a : b)).id : null;
  });

  get mobile() {
    return innerWidth < 760;
  }

  isOpen(id: AppId) {
    return this.wins().some(w => w.id === id);
  }

  open(id: AppId) {
    if (id === 'projects' && !this.isOpen('projects')) this.react('wow', 1600);
    const run = () => {
      const ex = this.wins().find(w => w.id === id);
      if (ex) { this.patch(id, { min: false, z: ++this.zTop }); return; }
      const d = appDef(id);
      const W = innerWidth, H = innerHeight;
      const w = Math.min(d.w, W - 40), h = Math.min(d.h, H - TOP - DOCK - 10);
      const n = this.wins().length;
      const left = W >= 1100 ? Math.min(330, W - w - 20) : 20; // keep the desktop icons visible on wide screens
      const x = Math.max(left, left + (W - left - w) / 2 + ((n % 5) - 2) * 28), y = Math.max(TOP + 10, TOP + (H - TOP - DOCK - h) / 2 + ((n % 5) - 2) * 22);
      this.wins.update(ws => [...ws, { id, x, y, w, h, z: ++this.zTop, min: false, max: this.mobile }]);
    };
    this.transition(run);
    history.replaceState(null, '', '#' + id);
  }
  close(id: AppId) {
    this.transition(() => this.wins.update(ws => ws.filter(w => w.id !== id)));
    if (location.hash === '#' + id) history.replaceState(null, '', location.pathname);
  }
  minimize(id: AppId) {
    this.transition(() => this.patch(id, { min: true }));
  }
  toggleMax(id: AppId) {
    const w = this.wins().find(x => x.id === id);
    if (w) this.transition(() => this.patch(id, { max: !w.max, z: ++this.zTop }));
  }
  focus(id: AppId) {
    const w = this.wins().find(x => x.id === id);
    if (w && w.z !== this.zTop) this.patch(id, { z: ++this.zTop });
  }
  /** Dock click: open, bring forward, or minimise if it is already in front. */
  dockClick(id: AppId) {
    const w = this.wins().find(x => x.id === id);
    if (w && !w.min && this.focused() === id) this.minimize(id);
    else this.open(id);
  }
  move(id: AppId, x: number, y: number) {
    this.patch(id, { x: Math.max(-200, Math.min(innerWidth - 120, x)), y: Math.max(TOP, Math.min(innerHeight - 60, y)) });
  }
  resize(id: AppId, w: number, h: number) {
    this.patch(id, { w: Math.max(360, w), h: Math.max(260, h) });
  }
  closeAll() {
    this.transition(() => this.wins.set([]));
  }

  notify(msg: string) {
    this.toast.set(msg);
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => this.toast.set(''), 2400);
  }
  async copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); this.notify(`${what} copied to clipboard`); this.react('party', 2000); }
    catch { this.notify(text); }
  }

  private patch(id: AppId, p: Partial<Win>) {
    this.wins.update(ws => ws.map(w => (w.id === id ? { ...w, ...p } : w)));
  }
  /** Uses the View Transitions API (when supported) so windows morph open/closed. */
  private transition(fn: () => void) {
    const d = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (d.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) d.startViewTransition(fn);
    else fn();
  }
}
