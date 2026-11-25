import { Injectable, signal } from '@angular/core';
import { LabId } from './lab-ids';

export interface SavedItem { id?: number; tool: LabId; title: string; text: string; at: number; }

const DB = 'kv-lab', STORE = 'saved', MAX = 50;
const done = <T>(r: IDBRequest<T>) => new Promise<T>((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });

/** Results the visitor chose to keep, in this browser's IndexedDB. */
@Injectable({ providedIn: 'root' })
export class SavedStore {
  readonly items = signal<SavedItem[]>([]);
  private db?: Promise<IDBDatabase>;

  async load() {
    const all = await done((await this.store('readonly')).getAll() as IDBRequest<SavedItem[]>);
    this.items.set(all.sort((a, b) => b.at - a.at));
  }

  async add(item: SavedItem) {
    await done((await this.store('readwrite')).add(item));
    await this.load();
    for (const old of this.items().slice(MAX)) await done((await this.store('readwrite')).delete(old.id!));
    if (this.items().length > MAX) await this.load();
  }

  async rename(id: number, title: string) {
    const item = this.items().find(i => i.id === id);
    if (!item) return;
    await done((await this.store('readwrite')).put({ ...item, title }));
    await this.load();
  }

  async remove(id: number) {
    await done((await this.store('readwrite')).delete(id));
    await this.load();
  }

  async clear() {
    await done((await this.store('readwrite')).clear());
    this.items.set([]);
  }

  private async store(mode: IDBTransactionMode) {
    this.db ??= new Promise<IDBDatabase>((ok, no) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    }).catch(e => { this.db = undefined; throw e; });
    return (await this.db).transaction(STORE, mode).objectStore(STORE);
  }
}
