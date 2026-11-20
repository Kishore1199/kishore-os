import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BRAND_ICON_PATHS } from './brand-icons';

/**
 * Icon for a skill: the official brand logo (Simple Icons) when one exists,
 * otherwise a stroke symbol that represents the concept (REST APIs, Microservices, …).
 */
@Component({
  selector: 'app-skill-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;line-height:0;flex-shrink:0' },
  template: `
    @if (brandPath(); as d) {
      <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" [attr.fill]="color()">
        <path [attr.d]="d" />
      </svg>
    } @else {
      <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" [attr.stroke]="color()"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        @switch (name()) {
          @case ('Microservices') { <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="8.5" y="14" width="7" height="7" rx="1.5"/><path d="M6.5 10v2h11v-2M12 12v2"/> }
          @case ('Servlets') { <rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/> }
          @case ('JSP') { <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/> }
          @case ('JDBC') { <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/> }
          @case ('JPA') { <path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/> }
          @case ('REST APIs') { <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/> }
          @case ('Eureka') { <circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/> }
          @case ('Manual Testing') { <rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/> }
          @case ('Agile') { <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/> }
          @case ('Log4j & SLF4J') { <path d="M4 6h16"/><path d="M4 12h11"/><path d="M4 18h14"/><circle cx="19.5" cy="12" r="0.5"/> }
          @case ('Jasper Studio') { <path d="M3 3v18h18"/><path d="M7 16v-4"/><path d="M12 16V8"/><path d="M17 16v-7"/> }
          @case ('VS Code') { <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/> }
          @case ('ChatGPT') { <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v6"/><path d="M9 10h6"/> }
          @case ('OpenEMR') { <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/> }
          @case ('FHIR R4') { <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/> }
          @case ('Twig') { <path d="M12 22V12"/><path d="M12 12 7 7"/><path d="M12 15l5-5"/><path d="M7 7a2 2 0 1 0 0-.01"/><path d="M17 10a2 2 0 1 0 0-.01"/> }
          @case ('Playwright') { <rect width="18" height="14" x="3" y="5" rx="2"/><path d="m9 12 2 2 4-4"/> }
          @default { <circle cx="12" cy="12" r="4"/> }
        }
      </svg>
    }
  `,
})
export class SkillIcon {
  readonly name = input.required<string>();
  readonly color = input('currentColor');
  readonly size = input(16);
  protected readonly brandPath = computed(() => BRAND_ICON_PATHS[this.name()] ?? null);
}
