import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { AssistantBus } from './assistant.bus';
import { CHAPTERS } from './notes.service';

interface InstallEvent extends Event { prompt(): Promise<void>; }

/** Installing the site as an app, and saving it for offline use. */
@Injectable({ providedIn: 'root' })
export class OfflineService {
  private sw = inject(SwUpdate);
  readonly supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  readonly active = signal(false);
  readonly canInstall = signal(false);
  readonly saving = signal(false);
  readonly saved = signal(0);
  readonly message = signal('');
  private prompt?: InstallEvent;

  constructor() {
    const bus = inject(AssistantBus);
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.prompt = e as InstallEvent; this.canInstall.set(true); });
    addEventListener('appinstalled', () => { this.canInstall.set(false); this.message.set('Installed.'); });
    if (!this.supported) return;
    this.active.set(!!navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => this.active.set(!!navigator.serviceWorker.controller));
    if (this.sw.isEnabled) this.sw.versionUpdates.subscribe(e => { if (e.type === 'VERSION_READY') bus.notify('A new version is ready. Reload to use it.'); });
  }

  async install() {
    const p = this.prompt;
    if (!p) return;
    this.prompt = undefined;
    this.canInstall.set(false);
    await p.prompt();
  }

  /** Request every file the no-AI tools need; the service worker keeps them. */
  async saveAll() {
    if (this.saving()) return;
    this.saving.set(true);
    this.saved.set(0);
    const files = [...CHAPTERS.filter(c => c.questions > 0).map(c => `assets/study/notes/${c.key}.json`), 'assets/study/search-index.json', 'assets/study/semantic/model.bin', 'assets/study/semantic/vocab.txt', 'assets/study/semantic/notes.bin',
      'assets/sql/runner.js', 'assets/sql/sql-wasm.js', 'assets/sql/sql-wasm.wasm', 'assets/Kishore_Resume.pdf'];
    let done = 0, failed = 0;
    const queue = [...files];
    await Promise.all([1, 2, 3, 4].map(async () => {
      for (let f; (f = queue.shift());) {
        try { const r = await fetch(f); if (!r.ok) failed++; else await r.arrayBuffer(); } catch { failed++; }
        this.saved.set(Math.round((++done / files.length) * 100));
      }
    }));
    try { await Promise.all([import('../layout/interview'), import('../layout/job-match'), import('../sections/ai-catalog'), import('../lab/lab-dialog')]); } catch { failed++; }
    this.saving.set(false);
    this.message.set(failed ? `${failed} of ${files.length} files could not be saved. Please try again.` : 'Saved. You can use the no-AI tools offline.');
  }
}
