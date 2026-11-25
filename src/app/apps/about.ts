import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '../core/icon';
import { Logo } from '../core/logo';
import { AssistantBus } from '../core/assistant.bus';
import { KaiService } from '../core/kai.service';
import { OsService } from '../core/os.service';
import { ABOUT_HIGHLIGHTS, EXPERIENCE, PROFILE, PROJECTS, SKILL_CATEGORIES } from '../data/portfolio.data';
import { STUDY_GUIDES } from '../data/study.data';

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Logo],
  template: `
    <div class="wrap">
      <section class="hero">
        <div class="avatar" aria-hidden="true"><app-logo [size]="120" /></div>
        <div>
          <p class="kicker">Hello, I'm</p>
          <h1>{{ p.name }}</h1>
          <p class="role">{{ p.role }} <span class="mono">· {{ p.location }}</span></p>
          <div class="cta">
            <button type="button" class="btn hot" (click)="kai.tour()"><app-icon name="volume" [size]="15" /> Hear the tour</button>
            <button type="button" class="btn" (click)="os.open('projects')"><app-icon name="folder" [size]="15" /> Projects</button>
            <button type="button" class="btn" (click)="bus.openMatcher()"><app-icon name="briefcase" [size]="15" /> Match a job</button>
            <button type="button" class="btn" (click)="kai.chatOpen.set(true); kai.startLive()"><app-icon name="mic" [size]="15" /> Live talk</button>
            <button type="button" class="btn" (click)="os.copy(p.email, 'Email')"><app-icon name="copy" [size]="15" /> Copy email</button>
          </div>
        </div>
      </section>

      <p class="bio">
        I build secure, scalable enterprise web applications with <b>Spring Boot</b>, <b>Angular</b> and <b>Hibernate</b>.
        For {{ years }}+ years I've shipped production software — today at <b>{{ now.company }}</b>, on the 75Health cloud EHR and the OpenEMR-based EMR,
        which I upgraded to PHP 8.4 with AI tools.
      </p>

      <div class="stats">
        @for (s of stats; track s.l) { <div class="st"><b>{{ s.v }}</b><span>{{ s.l }}</span></div> }
      </div>

      <div class="grid">
        @for (h of highlights; track h.title) {
          <div class="hl"><span class="hi"><app-icon [name]="h.icon" [size]="17" /></span><b>{{ h.title }}</b><p>{{ h.desc }}</p></div>
        }
      </div>

      <div class="now">
        <span class="dot"></span>
        <p><b>Currently:</b> {{ now.role }} at {{ now.company }} · {{ now.period }}</p>
        <button type="button" class="link mono" (click)="os.open('experience')">experience →</button>
      </div>
    </div>
  `,
  styles: `
    .wrap { padding: 28px; display: grid; gap: 22px; }
    .hero { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
    .avatar { flex-shrink: 0; filter: drop-shadow(0 20px 36px rgba(192,38,211,0.45)); transition: transform 0.4s; }
    .avatar:hover { transform: rotate(-6deg) scale(1.04); }
    h1 { font-size: clamp(2.2rem, 5vw, 3.4rem); margin: 4px 0; }
    .role { font-weight: 600; color: var(--ink-2); }
    .role span { font-weight: 400; font-size: 0.8rem; color: var(--ink-3); }
    .cta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .bio { font-size: 1.04rem; color: var(--ink-2); line-height: 1.7; }
    .bio b { color: var(--ink); }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .st { padding: 14px; border-radius: 16px; background: var(--glass-2); border: 1px solid var(--line); }
    .st b { display: block; font: 700 1.55rem/1.1 var(--display); letter-spacing: -0.03em; background: linear-gradient(135deg, var(--violet), var(--accent)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .st span { font-size: 0.78rem; color: var(--ink-3); }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .hl { padding: 16px; border-radius: 16px; border: 1px solid var(--line); background: var(--glass-2); }
    .hi { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; margin-bottom: 8px; color: #fff; background: linear-gradient(135deg, var(--violet), var(--accent)); }
    .hl b { display: block; margin-bottom: 4px; }
    .hl p { font-size: 0.86rem; color: var(--ink-2); }
    .now { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 14px; border: 1px solid color-mix(in srgb, var(--teal) 40%, transparent); background: color-mix(in srgb, var(--teal) 8%, transparent); }
    .now p { flex: 1; font-size: 0.9rem; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 10px var(--teal); }
    .link { border: 0; background: none; color: var(--teal); cursor: pointer; font-size: 0.78rem; }
    @media (max-width: 640px) { .wrap { padding: 18px; } .stats { grid-template-columns: repeat(2, 1fr); } .grid { grid-template-columns: 1fr; } }
  `,
})
export class About {
  protected readonly os = inject(OsService);
  protected readonly kai = inject(KaiService);
  protected readonly bus = inject(AssistantBus);
  protected readonly p = PROFILE;
  protected readonly now = EXPERIENCE[0];
  protected readonly years = 3;
  protected readonly highlights = ABOUT_HIGHLIGHTS;
  protected readonly stats = [
    { v: '3+', l: 'years experience' },
    { v: String(PROJECTS.length), l: 'projects' },
    { v: String(SKILL_CATEGORIES.reduce((n, c) => n + c.skills.length, 0)), l: 'technologies' },
    { v: STUDY_GUIDES.reduce((n, g) => n + g.topics.reduce((m, t) => m + t.questions, 0), 0).toLocaleString() + '+', l: 'prep questions' },
  ];
}
