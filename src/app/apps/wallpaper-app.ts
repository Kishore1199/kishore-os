import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Icon } from '../core/icon';
import { FITS, PRESETS, WallpaperService, pictureIn } from '../core/wallpaper.service';

/** Choose the desktop background. */
@Component({
  selector: 'app-wallpaper-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { '(dragover)': 'over($event)', '(dragleave)': 'hot.set(false)', '(drop)': 'drop($event)' },
  template: `
    <label class="up" [class.hot]="hot()" [class.busy]="w.busy()">
      <input #f type="file" accept="image/jpeg,image/png,image/webp" (change)="use(f.files?.[0]); f.value = ''" [disabled]="w.busy()" />
      <span class="ui"><app-icon name="image" [size]="24" /></span>
      <span><b>{{ w.busy() ? 'Preparing your picture…' : w.photo() ? 'Choose another picture' : 'Choose a picture' }}</b><small>JPG, PNG or WebP. You can also drop one here or on the desktop.</small></span>
    </label>
    @if (w.error()) { <p class="err" role="alert">{{ w.error() }}</p> }

    <div class="grid" role="group" aria-label="Backgrounds">
      <button type="button" class="opt" [attr.aria-pressed]="w.show() === 'aurora'" (click)="w.pick('aurora')"><i class="aurora"></i><span>Aurora</span></button>
      @if (w.photo(); as p) { <button type="button" class="opt" [attr.aria-pressed]="w.show() === 'photo'" (click)="w.pick('photo')"><img [src]="p" alt="" /><span>My picture</span></button> }
      @for (x of presets; track x.id) { <button type="button" class="opt" [attr.aria-pressed]="w.show() === x.id" (click)="w.pick(x.id)"><i [style.background]="x.css"></i><span>{{ x.label }}</span></button> }
    </div>

    @if (w.show() !== 'aurora') {
      <div class="set">
        @if (w.show() === 'photo') {
          <div class="row" role="group" aria-label="How the picture fits"><span>Picture</span>
            @for (x of fits; track x.id) { <button type="button" class="btn sm" [attr.aria-pressed]="w.fit() === x.id" (click)="w.setFit(x.id)">{{ x.label }}</button> }
          </div>
        }
        <label class="row"><span>Darken</span><input type="range" min="0" max="70" step="5" [value]="w.dim() * 100" (input)="w.setDim($any($event.target).valueAsNumber / 100)" [attr.aria-valuetext]="pct() + ' percent'" /><b class="mono">{{ pct() }}%</b></label>
        <div class="row"><button type="button" class="btn sm" (click)="w.reset()"><app-icon name="refresh" [size]="14" /> Back to aurora</button>
          @if (w.photo()) { <button type="button" class="btn sm" (click)="w.removePhoto()"><app-icon name="trash" [size]="14" /> Remove my picture</button> }</div>
      </div>
    }
    <p class="fine">Your picture stays in this browser and is never uploaded. Large photos are made smaller, and hidden details such as the location are removed. “Forget me” in the chat deletes it.</p>
  `,
  styles: `
    :host { display: grid; gap: 18px; align-content: start; min-height: 100%; padding: 20px 22px 26px; }
    .up { display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-radius: 18px; border: 2px dashed var(--line-2); cursor: pointer; transition: border-color 0.2s, background 0.2s; } .up:hover, .up.hot { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); } .up:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; } .up.busy { cursor: progress; }
    .up input { position: absolute; width: 1px; height: 1px; opacity: 0; } .up b { display: block; } .up small, .fine { color: var(--ink-2); font-size: 0.8rem; }
    .ui { width: 50px; height: 50px; flex-shrink: 0; display: grid; place-items: center; border-radius: 15px; color: #fff; background: linear-gradient(135deg, var(--violet), #c2410c); }
    .err { padding: 10px 14px; border-radius: 12px; font-size: 0.88rem; border: 1px solid #ef4444; background: color-mix(in srgb, #ef4444 12%, transparent); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 12px; }
    .opt { padding: 6px; border-radius: 16px; border: 2px solid transparent; background: var(--glass-2); color: var(--ink); cursor: pointer; display: grid; gap: 6px; font-size: 0.82rem; font-weight: 600; } .opt:hover { border-color: var(--line-2); } .opt[aria-pressed='true'] { border-color: var(--accent); }
    .opt i, .opt img { width: 100%; height: 78px; object-fit: cover; border-radius: 11px; } .aurora { background: radial-gradient(circle at 25% 80%, #0ea5a4, transparent 55%), radial-gradient(circle at 75% 20%, #6d28d9, transparent 60%), radial-gradient(circle at 90% 90%, #f97316, transparent 45%), #0b0920; }
    .set { display: grid; gap: 12px; padding: 16px 18px; border-radius: 16px; border: 1px solid var(--line); background: var(--glass-2); } .row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; } .row > span { width: 66px; color: var(--ink-2); font-size: 0.88rem; } .row input { flex: 1; min-width: 120px; accent-color: var(--accent); }
    .sm { padding: 8px 14px; font-size: 0.84rem; } .sm[aria-pressed='true'] { color: #fff; border-color: #c2410c; background: #c2410c; }
    @media (max-width: 760px) { :host { padding: 16px 14px 190px; } }
  `,
})
export class WallpaperApp {
  protected readonly w = inject(WallpaperService);
  protected readonly presets = PRESETS;
  protected readonly fits = FITS;
  protected readonly hot = signal(false);
  protected readonly pct = () => Math.round(this.w.dim() * 100);

  protected use(f?: File) {
    if (f) void this.w.usePhoto(f);
  }
  protected over(e: DragEvent) {
    e.preventDefault();
    this.hot.set(true);
  }
  protected drop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.hot.set(false);
    const f = pictureIn(e.dataTransfer);
    if (f) this.use(f); else this.w.error.set('Please drop a JPG, PNG or WebP picture.');
  }
}
