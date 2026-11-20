import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let uid = 0;

/**
 * Kishore.OS mark — a geometric "K" monogram on an ink tile.
 * The K is a stem plus a "<" code chevron (developer + initial), drawn with equal
 * stroke weights, square cuts and mitred joins so it stays crisp from 16 px up.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;line-height:0;flex-shrink:0' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient [attr.id]="id + 'tile'" x1="32" y1="0" x2="32" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#1c1932" />
          <stop offset="1" stop-color="#0b0a16" />
        </linearGradient>
        <linearGradient [attr.id]="id + 'ink'" x1="16" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#a78bfa" />
          <stop offset="0.55" stop-color="#e879f9" />
          <stop offset="1" stop-color="#fb923c" />
        </linearGradient>
      </defs>
      <!-- tile -->
      <rect x="1" y="1" width="62" height="62" rx="15" [attr.fill]="'url(#' + id + 'tile)'" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="14.5" stroke="#ffffff" stroke-opacity="0.12" />
      <path d="M16 2.5h32c6 0 10.5 3.5 12.5 8" stroke="#ffffff" stroke-opacity="0.18" stroke-linecap="round" />
      <!-- K monogram: stem + code chevron -->
      <rect x="17" y="15" width="7" height="34" rx="1.5" [attr.fill]="'url(#' + id + 'ink)'" />
      <path d="M27 32 41 15h9L36 32l14 17h-9z" [attr.fill]="'url(#' + id + 'ink)'" />
    </svg>
  `,
})
export class Logo {
  readonly size = input(28);
  protected readonly id = 'kvlogo' + uid++;
}
