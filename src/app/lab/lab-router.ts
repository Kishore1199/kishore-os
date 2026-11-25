import { Injectable, effect, inject, untracked } from '@angular/core';
import { AssistantBus } from '../core/assistant.bus';
import { OsService } from '../core/os.service';
import { labId } from './lab-ids';

/** Addresses in the OS style: #lab/compare opens a window; #lab/match and #lab/interview open a dialog that Back closes. */
@Injectable({ providedIn: 'root' })
export class LabRouter {
  private bus = inject(AssistantBus);
  private os = inject(OsService);

  constructor() {
    addEventListener('hashchange', () => this.open());
    let was = '';
    effect(() => {
      const at = this.bus.matcher() ? 'match' : this.bus.interview() ? 'interview' : '';
      untracked(() => {
        if (at && at !== this.current()) history.pushState(null, '', `#lab/${at}`);
        else if (!at && was && this.current() === was) this.os.address();
        was = at;
      });
    });
    this.open();
  }

  private current = () => location.hash.match(/^#lab\/([\w-]+)/)?.[1] ?? '';

  private open() {
    const at = this.current();
    if (at !== 'match' && this.bus.matcher()) this.bus.matcher.set(null);
    if (at !== 'interview' && this.bus.interview()) this.bus.interview.set(false);
    const id = labId(at);
    if (id) this.os.openTool(id);
    else if (at === 'match') { if (!this.bus.matcher()) this.bus.matcher.set({ text: '' }); }
    else if (at === 'interview') this.bus.interview.set(true);
  }
}
