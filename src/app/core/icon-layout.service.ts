import { Injectable, signal } from '@angular/core';
import { APPS, AppId } from './os.service';

export interface Spot { c: number; r: number; }
type Saved = Partial<Record<AppId, Spot>>;
const WIDE = 'kv-icons', PHONE = 'kv-icons-phone';
const IDS = APPS.map(a => a.id);
const read = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const whole = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 100;

/** Where the desktop icons are, in this browser. Screens with room use a free grid; phones keep an order. */
@Injectable({ providedIn: 'root' })
export class IconLayout {
  readonly spots = signal<Saved>(this.loadSpots());
  readonly order = signal<AppId[]>(this.loadOrder());

  /** Change the grid. Kept on the next visit. */
  move(changes: Saved) {
    this.spots.update(s => ({ ...s, ...changes }));
    write(WIDE, this.spots());
  }
  setOrder(order: AppId[], keep: boolean) {
    this.order.set(order);
    if (keep) write(PHONE, order);
  }
  /** Put every icon back. */
  reset() {
    this.spots.set({});
    this.order.set(IDS);
    try { localStorage.removeItem(WIDE); localStorage.removeItem(PHONE); } catch { /* storage unavailable */ }
  }

  private loadSpots(): Saved {
    const v = read(WIDE) as Record<string, Spot> | null, out: Saved = {};
    if (v && typeof v === 'object') for (const id of IDS) { const s = v[id]; if (s && whole(s.c) && whole(s.r)) out[id] = { c: s.c, r: s.r }; }
    return out;
  }
  private loadOrder(): AppId[] {
    const v = read(PHONE);
    const kept = Array.isArray(v) ? [...new Set(v)].filter((x): x is AppId => IDS.includes(x as AppId)) : [];
    return [...kept, ...IDS.filter(id => !kept.includes(id))]; // a new app goes to the end
  }
}

const key = (s: Spot) => `${s.c},${s.r}`;
/**
 * Gives every icon its own cell: the saved one when it can be used, otherwise the first free one.
 * `free` says whether a cell exists and nothing else on the screen covers it.
 */
export function layout(saved: Saved, cols: number, rows: number, free: (s: Spot) => boolean): Map<AppId, Spot> {
  const out = new Map<AppId, Spot>(), taken = new Set<string>();
  const usable = (s: Spot) => s.c < cols && s.r < rows && free(s) && !taken.has(key(s));
  for (const id of IDS) { const s = saved[id]; if (s && usable(s)) { out.set(id, s); taken.add(key(s)); } }
  let spill = 0;
  for (const id of IDS) {
    if (out.has(id)) continue;
    let at: Spot | null = null;
    for (let c = 0; c < cols && !at; c++) for (let r = 0; r < rows && !at; r++) if (usable({ c, r })) at = { c, r };
    at ??= { c: cols - 1, r: rows + spill++ }; // no room at all: below the screen's edge, still in order
    out.set(id, at);
    taken.add(key(at));
  }
  return out;
}
