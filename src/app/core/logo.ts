import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let uid = 0;

/**
 * Kishore.OS mark — three stacked isometric layers on an ink tile:
 * the full stack (frontend · backend · data). Flat shapes only, so it stays crisp from 16 px up.
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
        <linearGradient [attr.id]="id + 'ink'" x1="14" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#818cf8" />
          <stop offset="0.55" stop-color="#6366f1" />
          <stop offset="1" stop-color="#38bdf8" />
        </linearGradient>
      </defs>
      <!-- tile -->
      <rect x="1" y="1" width="62" height="62" rx="15" [attr.fill]="'url(#' + id + 'tile)'" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="14.5" stroke="#ffffff" stroke-opacity="0.12" />
      <path d="M16 2.5h32c6 0 10.5 3.5 12.5 8" stroke="#ffffff" stroke-opacity="0.18" stroke-linecap="round" />
      <!-- stacked layers: data (bottom), backend (middle), frontend (top) -->
      <path d="M13 39.5 32 49l19-9.5v5L32 54l-19-9.5z" [attr.fill]="'url(#' + id + 'ink)'" opacity="0.55" />
      <path d="M13 30.5 32 40l19-9.5v5L32 45l-19-9.5z" [attr.fill]="'url(#' + id + 'ink)'" opacity="0.8" />
      <path d="M32 11.5 51 21 32 30.5 13 21z" [attr.fill]="'url(#' + id + 'ink)'" />
    </svg>
  `,
})
export class Logo {
  readonly size = input(28);
  protected readonly id = 'kvlogo' + uid++;
}
