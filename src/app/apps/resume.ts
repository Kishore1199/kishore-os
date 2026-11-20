import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { Icon } from '../core/icon';
import { PROFILE } from '../data/portfolio.data';

@Component({
  selector: 'app-resume',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="bar">
      <span class="mono">{{ file }}</span>
      <a class="btn" [href]="p.resume" download><app-icon name="download" [size]="14" /> Download</a>
      <a class="btn" [href]="p.resume" target="_blank" rel="noopener"><app-icon name="external" [size]="14" /> New tab</a>
    </div>
    <iframe [src]="src" title="Kishore V resume (PDF)"></iframe>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; }
    .bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--line); }
    .bar span { flex: 1; font-size: 0.78rem; color: var(--ink-3); }
    .btn { padding: 7px 12px; font-size: 0.8rem; }
    iframe { flex: 1; width: 100%; border: 0; background: #525659; }
  `,
})
export class Resume {
  protected readonly p = PROFILE;
  protected readonly file = PROFILE.resume.split('/').pop();
  protected readonly src = inject(DomSanitizer).bypassSecurityTrustResourceUrl(PROFILE.resume + '#view=FitH');
}
