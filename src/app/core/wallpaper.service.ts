import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { VisitorMemory } from './visitor-memory.service';

export const PRESETS = [
  { id: 'dusk', label: 'Dusk', css: 'linear-gradient(160deg, #1e1b4b 0%, #7e22ce 45%, #f97316 100%)' },
  { id: 'ocean', label: 'Ocean', css: 'linear-gradient(160deg, #082f49 0%, #0e7490 55%, #5eead4 100%)' },
  { id: 'forest', label: 'Forest', css: 'linear-gradient(160deg, #052e16 0%, #166534 55%, #a3e635 100%)' },
  { id: 'rose', label: 'Rose', css: 'linear-gradient(160deg, #4c0519 0%, #be185d 55%, #fda4af 100%)' },
  { id: 'night', label: 'Night', css: 'radial-gradient(circle at 70% 20%, #334155 0%, #0f172a 45%, #020617 100%)' },
] as const;
export type PresetId = (typeof PRESETS)[number]['id'];
export type Fit = 'cover' | 'contain' | 'none';
export const FITS: { id: Fit; label: string }[] = [{ id: 'cover', label: 'Fill' }, { id: 'contain', label: 'Fit' }, { id: 'none', label: 'Centre' }];
type Show = 'aurora' | 'photo' | PresetId;
interface Saved { show: Show; fit: Fit; dim: number; }

const KEY = 'kv-wallpaper', DB = 'kv-wallpaper', STORE = 'photo';
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 25 * 1024 * 1024, MAX_SIDE = 2560, MAX_PIXELS = 80_000_000;
const DEFAULT: Saved = { show: 'aurora', fit: 'cover', dim: 0.25 };
const done = <T>(r: IDBRequest<T>) => new Promise<T>((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });

/** The desktop background. A picture stays in this browser: it is never uploaded anywhere. */
@Injectable({ providedIn: 'root' })
export class WallpaperService {
  private memory = inject(VisitorMemory);
  private readonly saved = signal<Saved>(this.load());
  readonly show = computed(() => this.saved().show);
  readonly fit = computed(() => this.saved().fit);
  readonly dim = computed(() => this.saved().dim);
  /** address of the visitor's picture, when there is one */
  readonly photo = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly aurora = computed(() => this.show() === 'aurora' || (this.show() === 'photo' && !this.photo() && this.missing()));
  readonly preset = computed(() => PRESETS.find(p => p.id === this.show())?.css ?? '');
  private readonly missing = signal(false);
  private db?: Promise<IDBDatabase>;
  private run = 0;

  constructor() {
    void this.restore();
    // the icon names change colour on a picture
    effect(() => { const d = document.documentElement.dataset; if (this.aurora()) delete d['wallpaper']; else d['wallpaper'] = '1'; });
  }

  pick(show: Show) {
    this.error.set('');
    if (show === 'photo' && !this.photo()) return;
    this.update({ show });
  }
  setFit(fit: Fit) { this.update({ fit }); }
  setDim(dim: number) { this.update({ dim: Math.max(0, Math.min(0.7, dim || 0)) }); }

  /** Shrink the picture, keep it in this browser and show it. */
  async usePhoto(file: File): Promise<boolean> {
    this.error.set('');
    if (!TYPES.includes(file.type)) { this.error.set('Please choose a JPG, PNG or WebP picture.'); return false; }
    if (file.size > MAX_BYTES) { this.error.set('That picture is larger than 25 MB. Please choose a smaller one.'); return false; }
    const run = ++this.run;
    this.busy.set(true);
    try {
      const blob = await shrink(file);
      if (run !== this.run) return false;
      this.showBlob(blob);
      this.update({ show: 'photo' });
      if (this.memory.on()) await this.put(blob).catch(() => this.error.set('It is shown now, but this browser could not keep it for next time.'));
      return true;
    } catch (e) {
      if (run === this.run) this.error.set(e instanceof Error && e.message === 'too big' ? 'That picture has too many pixels. Please choose a smaller one.' : 'That picture could not be opened.');
      return false;
    } finally {
      if (run === this.run) this.busy.set(false);
    }
  }

  async removePhoto() {
    this.run++;
    this.busy.set(false);
    if (this.show() === 'photo') this.update({ show: 'aurora' });
    this.showBlob(null);
    await this.drop().catch(() => { /* nothing kept, or storage unavailable */ });
  }

  /** Back to the aurora. The picture stays, so it can be chosen again. */
  reset() { this.error.set(''); this.update({ show: 'aurora' }); }

  /** "Forget me": the picture goes too. */
  forget() {
    void this.removePhoto();
    this.saved.set(DEFAULT);
    try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  }

  private update(c: Partial<Saved>) {
    this.saved.update(s => ({ ...s, ...c }));
    if (!this.memory.on()) return;
    try { localStorage.setItem(KEY, JSON.stringify(this.saved())); } catch { /* storage unavailable */ }
  }

  private load(): Saved {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>;
      return {
        show: v.show === 'photo' || PRESETS.some(p => p.id === v.show) ? v.show! : 'aurora',
        fit: FITS.find(f => f.id === v.fit)?.id ?? DEFAULT.fit,
        dim: typeof v.dim === 'number' && v.dim >= 0 && v.dim <= 0.7 ? v.dim : DEFAULT.dim,
      };
    } catch { return DEFAULT; }
  }

  private async restore() {
    const run = this.run;
    try {
      const b = await done((await this.store('readonly')).get('me') as IDBRequest<Blob | undefined>);
      if (run !== this.run) return;
      if (b instanceof Blob) this.showBlob(b); else this.missing.set(true);
    } catch { this.missing.set(true); }
  }

  private showBlob(b: Blob | null) {
    const old = this.photo();
    this.photo.set(b ? URL.createObjectURL(b) : '');
    if (old) setTimeout(() => URL.revokeObjectURL(old), 1000);
  }

  private async put(b: Blob) { await done((await this.store('readwrite')).put(b, 'me')); }
  private async drop() { await done((await this.store('readwrite')).delete('me')); }
  private async store(mode: IDBTransactionMode) {
    this.db ??= new Promise<IDBDatabase>((ok, no) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    }).catch(e => { this.db = undefined; throw e; });
    return (await this.db).transaction(STORE, mode).objectStore(STORE);
  }
}

/** Draws the picture again at a sensible size. This also drops hidden details such as where a photo was taken. */
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  try {
    if (img.width * img.height > MAX_PIXELS) throw new Error('too big');
    const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext('2d');
    if (!g) throw new Error('no canvas');
    g.drawImage(img, 0, 0, c.width, c.height);
    const as = (type: string) => new Promise<Blob | null>(ok => c.toBlob(ok, type, 0.86));
    const out = (await as('image/webp')) ?? (await as('image/jpeg'));
    if (!out) throw new Error('not encoded');
    return out;
  } finally { img.close(); }
}

/** The first picture among dropped files. */
export const pictureIn = (d: DataTransfer | null): File | undefined => [...(d?.files ?? [])].find(f => f.type.startsWith('image/'));
