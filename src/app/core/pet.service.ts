import { Injectable, signal } from '@angular/core';

/** Whether ALPHA walks around the desktop. Off until somebody turns it on. */
@Injectable({ providedIn: 'root' })
export class PetService {
  readonly on = signal(this.load());

  set(on: boolean) {
    this.on.set(on);
    try { localStorage.setItem('kv-pet', on ? '1' : '0'); } catch { /* storage unavailable */ }
  }

  private load() {
    try { return localStorage.getItem('kv-pet') === '1'; } catch { return false; }
  }
}
