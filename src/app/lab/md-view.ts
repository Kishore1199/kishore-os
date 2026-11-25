import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Diagram } from './diagram';
import { parseMarkdown } from './md';

/** Shows Markdown from a model or a rule. Everything is bound as text, never as HTML. */
@Component({
  selector: 'app-md',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Diagram, NgTemplateOutlet],
  template: `
    @for (b of blocks(); track $index) {
      @switch (b.k) {
        @case ('h') { <h3><ng-container [ngTemplateOutlet]="t" [ngTemplateOutletContext]="{ $implicit: b.spans }" /></h3> }
        @case ('p') { <p><ng-container [ngTemplateOutlet]="t" [ngTemplateOutletContext]="{ $implicit: b.spans }" /></p> }
        @case ('ul') { <ul>@for (i of b.items; track $index) { <li><ng-container [ngTemplateOutlet]="t" [ngTemplateOutletContext]="{ $implicit: i }" /></li> }</ul> }
        @case ('ol') { <ol>@for (i of b.items; track $index) { <li><ng-container [ngTemplateOutlet]="t" [ngTemplateOutletContext]="{ $implicit: i }" /></li> }</ol> }
        @case ('code') { <div class="code"><button type="button" (click)="copy(b.text)" aria-label="Copy code">Copy</button><pre tabindex="0">{{ b.text }}</pre></div> }
        @case ('mermaid') { <app-diagram [code]="b.text" /> }
        @case ('table') {
          <div class="scroll" tabindex="0" role="region" aria-label="Table"><table>
            <thead><tr>@for (c of b.head; track $index) { <th scope="col"><ng-container [ngTemplateOutlet]="t" [ngTemplateOutletContext]="{ $implicit: c }" /></th> }</tr></thead>
            <tbody>@for (r of b.rows; track $index) { <tr>@for (c of r; track $index) { <td><ng-container [ngTemplateOutlet]="t" [ngTemplateOutletContext]="{ $implicit: c }" /></td> }</tr> }</tbody>
          </table></div>
        }
      }
    }
    <ng-template #t let-spans>@for (s of $any(spans); track $index) {@if (s.c) {<code>{{ s.t }}</code>} @else if (s.b) {<b>{{ s.t }}</b>} @else {<span>{{ s.t }}</span>}}</ng-template>
  `,
  styles: `
    :host { display: grid; gap: 12px; min-width: 0; font-size: 0.88rem; line-height: 1.6; color: var(--text-2); }
    h3 { font-size: 1rem; color: var(--text); margin-top: 4px; } b { color: var(--text); }
    p, li { overflow-wrap: anywhere; } ul, ol { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
    code { font: 0.82em 'JetBrains Mono', monospace; padding: 1px 5px; border-radius: 6px; background: var(--surface-2); color: var(--text); overflow-wrap: anywhere; }
    .code { position: relative; min-width: 0; }
    .code pre { margin: 0; padding: 14px; overflow-x: auto; border: 1px solid var(--border); border-radius: 14px; background: var(--bg-2); color: var(--text); font: 0.78rem/1.55 'JetBrains Mono', monospace; }
    .code button { position: absolute; top: 8px; right: 8px; padding: 4px 10px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--surface-solid); color: var(--text-2); font-size: 0.72rem; cursor: pointer; }
    .scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; } th, td { padding: 8px 11px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--border); }
    th { color: var(--text); white-space: nowrap; } tbody tr:last-child td { border-bottom: 0; }
  `,
})
export class MdView {
  readonly text = input.required<string>();
  protected readonly blocks = computed(() => parseMarkdown(this.text()));
  protected copy(t: string) { void navigator.clipboard?.writeText(t).catch(() => { /* blocked */ }); }
}
