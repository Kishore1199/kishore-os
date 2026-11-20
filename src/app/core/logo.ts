import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let uid = 0;

/**
 * Kishore.OS mark: a gradient app tile with a "K" drawn as code — a stem plus a "<" bracket —
 * and a teal status light for ALPHA, the voice guide.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;line-height:0;flex-shrink:0' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient [attr.id]="id + 'bg'" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#7c3aed" />
          <stop offset="0.55" stop-color="#c026d3" />
          <stop offset="1" stop-color="#ff7a3d" />
        </linearGradient>
        <linearGradient [attr.id]="id + 'gl'" x1="32" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#fff" stop-opacity="0.38" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <radialGradient [attr.id]="id + 'dot'" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(48 16) scale(9)">
          <stop offset="0" stop-color="#ccfbf1" />
          <stop offset="0.45" stop-color="#2dd4bf" />
          <stop offset="1" stop-color="#2dd4bf" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" [attr.fill]="'url(#' + id + 'bg)'" />
      <rect x="2" y="2" width="60" height="30" rx="17" [attr.fill]="'url(#' + id + 'gl)'" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="16.25" stroke="#fff" stroke-opacity="0.22" stroke-width="1.5" />
      <!-- K: stem + code bracket -->
      <path d="M20 17v30" stroke="#fff" stroke-width="6.5" stroke-linecap="round" />
      <path d="M42 18 28.5 32 42 46" stroke="#fff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
      <!-- ALPHA status light -->
      <circle cx="48" cy="16" r="9" [attr.fill]="'url(#' + id + 'dot)'" />
      <circle cx="48" cy="16" r="3.6" fill="#ecfeff" />
    </svg>
  `,
})
export class Logo {
  readonly size = input(28);
  protected readonly id = 'kvlogo' + uid++;
}
