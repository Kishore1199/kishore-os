import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { ThemeService } from '../core/theme.service';

let n = 0;

/** Draws Mermaid text. The SVG is shown as an image, so nothing inside it can run or load anything. */
@Component({
  selector: 'app-diagram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src(); as s) { <div class="box"><img [src]="s" [width]="size().w" [height]="size().h" alt="Diagram. The Mermaid text is below." /></div> <a [href]="s" download="diagram.svg">Download SVG</a> }
    @else if (failed()) { <p>This diagram could not be drawn. Its text is below.</p> }
    @else { <p role="status">Drawing the diagram…</p> }
    <details [open]="failed()"><summary>Mermaid text</summary><pre>{{ code() }}</pre></details>
  `,
  styles: `
    :host { display: grid; gap: 8px; }
    .box { overflow: auto; padding: 12px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface-2); }
    img { display: block; max-width: max(100%, 640px); height: auto; margin: auto; }
    p, summary, a { font-size: 0.8rem; color: var(--text-2); } a { color: var(--accent); justify-self: start; }
    summary { cursor: pointer; } pre { margin: 8px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; font: 0.76rem 'JetBrains Mono', monospace; color: var(--text-2); }
  `,
})
export class Diagram {
  readonly code = input.required<string>();
  protected readonly src = signal('');
  protected readonly size = signal({ w: 600, h: 300 });
  protected readonly failed = signal(false);
  private url = '';

  constructor() {
    const theme = inject(ThemeService);
    let run = 0;
    effect(() => { const code = this.code(), dark = theme.isDark(), my = ++run; void this.draw(code, dark, () => my === run); });
    inject(DestroyRef).onDestroy(() => { run = -1; if (this.url) URL.revokeObjectURL(this.url); });
  }

  private async draw(code: string, dark: boolean, current: () => boolean) {
    try {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true, htmlLabels: false, theme: dark ? 'dark' : 'default', fontFamily: 'Arial, sans-serif', flowchart: { htmlLabels: false } });
      // strip directives and clicks: styling and links are not wanted from a model
      const text = code.replace(/%%\{[\s\S]*?\}%%/g, '').replace(/^---[\s\S]*?---\s*/, '').split('\n').filter(l => !/^\s*click\s/.test(l)).join('\n');
      const { svg } = await mermaid.render(`kv-diagram-${++n}`, text);
      if (!current()) return;
      const box = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
      const w = Math.ceil(Number(box?.[1]) || 600), h = Math.ceil(Number(box?.[2]) || 300);
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = URL.createObjectURL(new Blob([svg.replace(/<svg([^>]*?)\swidth="[^"]*"/, `<svg$1 width="${w}" height="${h}"`)], { type: 'image/svg+xml' }));
      this.size.set({ w, h });
      this.failed.set(false);
      this.src.set(this.url);
    } catch (e) {
      console.warn('[lab] diagram failed', e);
      if (current()) { this.src.set(''); this.failed.set(true); }
    }
  }
}
