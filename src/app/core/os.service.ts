import { Injectable, computed, signal } from '@angular/core';
import { AI_FEATURES } from '../data/ai-features.data';
import { LabId, labId } from '../lab/lab-ids';

export type AppId = 'about' | 'projects' | 'experience' | 'skills' | 'notes' | 'terminal' | 'contact' | 'games' | 'monitor' | 'resume' | 'guestbook' | 'ailab' | 'files' | 'wallpaper';
/** an AI Lab tool in its own window */
export type ToolId = `tool:${LabId}`;
export type WinId = AppId | ToolId;

export interface AppDef { id: WinId; title: string; icon: string; color: string; w: number; h: number; dock?: boolean; }

export const APPS: (AppDef & { id: AppId })[] = [
  { id: 'about', title: 'About Me', icon: 'user', color: '#f97316', w: 760, h: 560, dock: true },
  { id: 'projects', title: 'Projects', icon: 'folder', color: '#3b82f6', w: 980, h: 640, dock: true },
  { id: 'experience', title: 'Experience', icon: 'briefcase', color: '#10b981', w: 820, h: 620, dock: true },
  { id: 'skills', title: 'Skills', icon: 'layers', color: '#a855f7', w: 900, h: 620, dock: true },
  { id: 'notes', title: 'Study Notes', icon: 'book-open', color: '#eab308', w: 940, h: 640, dock: true },
  { id: 'terminal', title: 'Terminal', icon: 'terminal', color: '#22c55e', w: 760, h: 480, dock: true },
  { id: 'contact', title: 'Contact', icon: 'mail', color: '#ec4899', w: 820, h: 600, dock: true },
  { id: 'ailab', title: 'AI Lab', icon: 'spark', color: '#22d3ee', w: 1080, h: 720, dock: true },
  { id: 'files', title: 'Files', icon: 'folder', color: '#0ea5e9', w: 820, h: 560 },
  { id: 'wallpaper', title: 'Wallpaper', icon: 'image', color: '#db2777', w: 720, h: 680 },
  { id: 'guestbook', title: 'Guestbook', icon: 'message', color: '#f59e0b', w: 900, h: 640 },
  { id: 'games', title: 'Arcade', icon: 'gamepad', color: '#ef4444', w: 760, h: 600 },
  { id: 'monitor', title: 'System Monitor', icon: 'activity', color: '#06b6d4', w: 900, h: 640 },
  { id: 'resume', title: 'Resume.pdf', icon: 'file', color: '#64748b', w: 820, h: 700 },
];
/** the tool inside a tool window, or undefined for an app */
export const toolOf = (id: WinId): LabId | undefined => (id.startsWith('tool:') ? labId(id.slice(5)) : undefined);
const BIG: LabId[] = ['graph', 'timeline', 'compare', 'sql-run', 'trace', 'evals', 'team', 'microservices', 'architecture'];
const tools = new Map<ToolId, AppDef>();
export function appDef(id: WinId): AppDef {
  const tool = toolOf(id);
  if (!tool) return APPS.find(a => a.id === id)!;
  let d = tools.get(id as ToolId);
  if (!d) {
    const f = AI_FEATURES.find(x => x.action && 'lab' in x.action && x.action.lab === tool);
    const big = BIG.includes(tool);
    d = { id, title: f?.title ?? tool, icon: f?.icon ?? 'spark', color: '#0891b2', w: big ? 860 : 700, h: big ? 660 : 600 };
    tools.set(id as ToolId, d);
  }
  return d;
}
/** the address of a window: #projects, #lab/compare */
export const hashOf = (id: WinId) => '#' + id.replace('tool:', 'lab/');
export const winId = (v: unknown): WinId | undefined => {
  if (typeof v !== 'string') return undefined;
  if (v.startsWith('tool:')) { const t = labId(v.slice(5)); return t && `tool:${t}`; }
  return APPS.find(a => a.id === v)?.id;
};

export interface Win { id: WinId; x: number; y: number; w: number; h: number; z: number; min: boolean; max: boolean; }

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
  readonly narrators = new Map<WinId, () => string>();
  /** what a tool window starts with */
  readonly seeds = new Map<WinId, Record<string, string>>();
  /** told about every message shown as a toast */
  readonly onNotify = new Set<(msg: string) => void>();
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

  isOpen(id: WinId) {
    return this.wins().some(w => w.id === id);
  }

  open(id: WinId) {
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
      this.wins.update(ws => [...ws, { id, x: Math.max(0, x), y, w, h, z: ++this.zTop, min: false, max: this.mobile }]);
    };
    this.transition(run);
    history.replaceState(null, '', hashOf(id));
  }
  /** Open a tool in its own window; asking again starts it afresh. */
  openTool(tool: LabId, seed: Record<string, string> = {}) {
    if (tool === 'guestbook') return this.open('guestbook');
    if (tool === 'saved') return this.open('files');
    const id: ToolId = `tool:${tool}`;
    const again = this.isOpen(id) && Object.keys(seed).length > 0;
    this.seeds.set(id, seed);
    if (again) this.wins.update(ws => ws.filter(w => w.id !== id));
    if (again) setTimeout(() => this.open(id)); else this.open(id);
  }
  close(id: WinId) {
    this.transition(() => {
      this.wins.update(ws => ws.filter(w => w.id !== id));
      this.seeds.delete(id);
      this.address();
    });
  }
  /** the address follows the window in front */
  address() {
    const f = this.focused();
    history.replaceState(null, '', f ? hashOf(f) : location.pathname);
  }
  minimize(id: WinId) {
    this.transition(() => { this.patch(id, { min: true }); this.address(); });
  }
  toggleMax(id: WinId) {
    const w = this.wins().find(x => x.id === id);
    if (w) this.transition(() => this.patch(id, { max: !w.max, z: ++this.zTop }));
  }
  focus(id: WinId) {
    const w = this.wins().find(x => x.id === id);
    if (w && w.z !== this.zTop) { this.patch(id, { z: ++this.zTop }); this.address(); }
  }
  /** Dock click: open, bring forward, or minimise if it is already in front. */
  dockClick(id: WinId) {
    const w = this.wins().find(x => x.id === id);
    if (w && !w.min && this.focused() === id) this.minimize(id);
    else this.open(id);
  }
  move(id: WinId, x: number, y: number) {
    this.patch(id, { x: Math.max(-200, Math.min(innerWidth - 120, x)), y: Math.max(TOP, Math.min(innerHeight - 60, y)) });
  }
  resize(id: WinId, w: number, h: number) {
    this.patch(id, { w: Math.max(360, w), h: Math.max(260, h) });
  }
  closeAll() {
    this.transition(() => { this.wins.set([]); this.seeds.clear(); this.address(); });
  }

  // ───────── arranging windows ─────────

  private area() {
    return { x: 10, y: TOP + 8, w: innerWidth - 20, h: innerHeight - TOP - DOCK - 8 };
  }
  private place(spots: { id: WinId; x: number; y: number; w: number; h: number }[]) {
    this.transition(() => {
      for (const s of spots) this.patch(s.id, { x: s.x, y: s.y, w: s.w, h: s.h, min: false, max: false, z: ++this.zTop });
      this.address();
    });
  }
  /** windows on screen, the one in front first */
  private shown() {
    return this.wins().filter(w => !w.min).sort((a, b) => b.z - a.z);
  }
  /** Every open window side by side in a grid. Phones show one window at a time. */
  tile(): boolean {
    const ws = this.shown().slice(0, 9).reverse();
    if (!ws.length || this.mobile) return false;
    const a = this.area(), cols = ws.length === 1 ? 1 : ws.length <= 4 ? 2 : 3, rows = Math.ceil(ws.length / cols), gap = 8;
    const h = (a.h - gap * (rows - 1)) / rows;
    this.place(ws.map((w, i) => {
      const r = Math.floor(i / cols), inRow = r === rows - 1 ? ws.length - cols * (rows - 1) : cols;
      const width = (a.w - gap * (inRow - 1)) / inRow;
      return { id: w.id, x: a.x + (i - r * cols) * (width + gap), y: a.y + r * (h + gap), w: width, h };
    }));
    return true;
  }
  cascade(): boolean {
    const ws = this.shown().reverse();
    if (!ws.length || this.mobile) return false;
    const a = this.area();
    this.place(ws.map((w, i) => { const d = appDef(w.id); return { id: w.id, x: a.x + 40 + i * 34, y: a.y + i * 30, w: Math.min(d.w, a.w - 60 - i * 34), h: Math.min(d.h, a.h - i * 30) }; }));
    return true;
  }
  /** Two windows, half the screen each. */
  side(left: WinId, right: WinId): boolean {
    for (const id of [left, right]) if (!this.isOpen(id)) this.open(id);
    if (this.mobile || left === right) return false;
    const half = (this.area().w - 8) / 2;
    setTimeout(() => { const a = this.area(); this.place([{ id: left, x: a.x, y: a.y, w: half, h: a.h }, { id: right, x: a.x + half + 8, y: a.y, w: half, h: a.h }]); }, 60);
    return true;
  }
  snap(id: WinId, to: 'left' | 'right'): boolean {
    if (this.mobile || !this.isOpen(id)) return false;
    const a = this.area(), half = (a.w - 8) / 2;
    this.place([{ id, x: to === 'left' ? a.x : a.x + half + 8, y: a.y, w: half, h: a.h }]);
    return true;
  }
  minimizeAll() {
    this.transition(() => { this.wins.update(ws => ws.map(w => ({ ...w, min: true }))); this.address(); });
  }
  /** Open the app before or after the one in front, in dock order. */
  cycle(d: 1 | -1): AppId {
    const ids = APPS.map(a => a.id), f = this.focused();
    const at = ids.indexOf(f as AppId);
    const id = ids[(at < 0 ? (d > 0 ? 0 : ids.length - 1) : (at + d + ids.length) % ids.length)];
    this.open(id);
    return id;
  }
  /** Scroll the window in front. */
  scroll(to: 'up' | 'down' | 'top' | 'bottom') {
    const root = document.querySelector('app-window.focused > .body');
    if (!root) return;
    // some apps scroll inside themselves
    const el = [root, ...root.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY)).sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    if (!el) return;
    const behavior: ScrollBehavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const step = el.clientHeight * 0.75;
    if (to === 'top' || to === 'bottom') el.scrollTo({ top: to === 'top' ? 0 : el.scrollHeight, behavior });
    else el.scrollBy({ top: to === 'down' ? step : -step, behavior });
  }

  /** Put back the windows from an earlier visit. */
  restore(wins: Win[]) {
    const fit = wins.map(w => ({ ...w, w: Math.min(w.w, innerWidth - 20), h: Math.min(w.h, innerHeight - TOP - 20), x: Math.max(0, Math.min(w.x, innerWidth - 160)), y: Math.max(TOP, Math.min(w.y, innerHeight - 120)), max: this.mobile || w.max }));
    this.zTop = Math.max(this.zTop, ...fit.map(w => w.z));
    this.wins.set(fit);
    this.address();
  }

  notify(msg: string) {
    this.toast.set(msg);
    for (const f of this.onNotify) f(msg);
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => this.toast.set(''), 2400);
  }
  async copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); this.notify(`${what} copied to clipboard`); this.react('party', 2000); }
    catch { this.notify(text); }
  }

  private patch(id: WinId, p: Partial<Win>) {
    this.wins.update(ws => ws.map(w => (w.id === id ? { ...w, ...p } : w)));
  }
  /** Uses the View Transitions API (when supported) so windows morph open/closed. */
  private transition(fn: () => void) {
    const d = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };
    if (!d.startViewTransition || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return fn();
    const t = d.startViewTransition(fn);
    // a second change soon after skips the first animation; that is fine
    t.ready.catch(() => { /* skipped */ });
    t.finished.catch(() => { /* skipped */ });
  }
}
