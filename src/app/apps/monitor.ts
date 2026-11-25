import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Icon } from '../core/icon';
import { DAILY_REQUESTS } from '../core/ai-budget';
import { KaiService } from '../core/kai.service';
import { OsService } from '../core/os.service';
import { ThemeService } from '../core/theme.service';
import { TraceStore } from '../core/trace.store';

interface Node { id: string; name: string; sub: string; icon: string; info: string; }
interface Map { key: string; label: string; note: string; rows: Node[][]; }

const MAPS: Map[] = [
  {
    key: 'site', label: 'This website', note: 'How this portfolio is put together. Everything below is real — open DevTools to check.',
    rows: [
      [{ id: 'browser', name: 'Your browser', sub: 'no backend needed', icon: 'globe', info: 'A static Angular build. Everything — windows, voice, search, terminal — runs on your device. The contact form talks to EmailJS, the guestbook to Firestore, and ALPHA to Google Gemini when it is available.' }],
      [{ id: 'shell', name: 'Kishore.OS shell', sub: 'Angular 22 · signals · zoneless', icon: 'layout', info: 'Standalone OnPush components driven by signals, no Zone.js. An OsService manages windows (open, focus, drag, resize, minimise) and deep links like #projects.' }],
      [
        { id: 'wm', name: 'Window manager', sub: 'View Transitions API', icon: 'layers', info: 'Opening, closing and maximising use document.startViewTransition, so windows morph smoothly in supporting browsers and fall back gracefully elsewhere.' },
        { id: 'kai', name: 'ALPHA voice guide', sub: 'Web Speech API', icon: 'mic', info: 'speechSynthesis speaks with word-boundary events driving live captions and the orb’s mouth; SpeechRecognition turns your voice into questions. The agent behind it uses Google Gemini through Firebase, with built-in answers when that is not available. No API keys — answers come from the portfolio data.' },
        { id: 'spot', name: 'Spotlight', sub: 'Ctrl / ⌘ + K', icon: 'search', info: 'One index over apps, actions, projects, 58 skills and all 84 study chapters, with keyboard navigation.' },
      ],
      [
        { id: 'gl', name: 'Aurora wallpaper', sub: 'three.js GLSL shader', icon: 'cpu', info: 'A domain-warped noise shader rendered at reduced resolution and ~40 fps, paused when the tab is hidden. It brightens and ripples while ALPHA speaks.' },
        { id: 'term', name: 'Terminal', sub: '20+ commands', icon: 'terminal', info: 'A small shell with history, tab completion and commands that drive the OS: open, ls, notes, theme, tour, say, kai, alpha…' },
        { id: 'data', name: 'Data files', sub: 'portfolio.data · study.data', icon: 'database', info: 'All content lives in two TypeScript files; every app, ALPHA’s narration and Spotlight read from them, so nothing drifts out of sync.' },
      ],
    ],
  },
  {
    key: 'ehr', label: '75Health EHR (simplified)', note: 'A simplified view of the stack I work on day to day. Details are generalised — no internal specifics.',
    rows: [
      [{ id: 'user', name: 'Clinic staff', sub: 'doctors · admins', icon: 'heart-pulse', info: 'Providers use the platform for patient records, SOAP notes, e-prescriptions and scheduling.' }],
      [{ id: 'ng', name: 'Angular 17 SPA', sub: 'TypeScript · Bootstrap', icon: 'layout', info: 'Component-driven screens, reactive forms, route guards and an HTTP interceptor that attaches the JWT to API calls.' }],
      [{ id: 'sec', name: 'Spring Security + JWT', sub: 'authn · role-based authz', icon: 'lock', info: 'Every request is authenticated with a JWT; roles decide which clinical features a user can reach. Audit tracking for compliance.' }],
      [
        { id: 'api', name: 'Spring Boot REST', sub: 'Java 21 · Gradle', icon: 'server', info: 'Layered controllers and services implementing scheduling, records and lab workflows, with Log4j logging.' },
        { id: 'orm', name: 'Hibernate 6 / JPA', sub: 'entities · transactions', icon: 'layers', info: 'Persistence layer with entities, repositories and transaction management; query tuning for multi-user load.' },
      ],
      [
        { id: 'mysql', name: 'MySQL', sub: 'relational records', icon: 'database', info: 'Structured clinical data.' },
        { id: 'mongo', name: 'MongoDB', sub: 'documents', icon: 'database', info: 'Document-shaped data alongside the relational store.' },
      ],
    ],
  },
];

@Component({
  selector: 'app-monitor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="inner">
          <div class="readouts mono">
            <span><i class="ok"></i> {{ fps() }} fps</span>
            <span>load {{ load }} ms</span>
            <span>{{ vw() }}</span>
            <span>theme · {{ theme.isDark() ? 'night' : 'day' }}</span>
            <span>webgl · {{ gl }}</span>
          </div>

          <div class="tabs">
            <button type="button" [class.on]="mk() === 'alpha'" (click)="mk.set('alpha')">ALPHA, live</button>
            @for (m of maps; track m.key) {
              <button type="button" [class.on]="mk() === m.key" (click)="mk.set(m.key); sel.set(null)">{{ m.label }}</button>
            }
          </div>

          @if (mk() === 'alpha') {
            <div class="nums">
              <div><b>{{ status() }}</b><span>who answers</span></div>
              <div><b>{{ kai.cloud.remaining() ? kai.cloud.remaining() + ' of ' + daily : 'Resting' }}</b><span>{{ kai.cloud.remaining() ? 'AI requests left today' : 'no AI requests for now' }}</span></div>
              <div><b>{{ runs().length }}</b><span>AI runs this visit</span></div>
              <div><b>{{ tokens() }}</b><span>tokens this visit</span></div>
            </div>
            <div class="now" aria-live="polite">
              @if (kai.liveSteps().length) { @for (s of kai.liveSteps(); track $index) { <p [class]="s.state"><app-icon [name]="s.icon" [size]="13" /> {{ s.label }}</p> } }
              @else if (kai.thinking()) { <p>Thinking…</p> } @else if (kai.voice.speaking()) { <p>Speaking.</p> } @else if (kai.voice.listening()) { <p>Listening.</p> } @else { <p>Idle. Ask something and watch the steps appear here.</p> }
            </div>
            @for (r of runs().slice(0, 5); track r.id) {
              <details [open]="$first"><summary><b>{{ r.title }}</b> <span class="mono">{{ r.steps.length }} steps · {{ r.ms }} ms</span></summary>
                <ol>@for (s of r.steps; track $index) { <li [class.bad]="!s.ok"><span>{{ s.label }}</span><i [style.width.%]="100 * s.ms / (r.ms || 1)"></i><small class="mono">{{ s.ms }} ms{{ s.tokensIn ? ' · ' + s.tokensIn + ' in, ' + (s.tokensOut ?? 0) + ' out' : '' }}</small></li> }</ol>
              </details>
            } @empty { <p class="note">No AI requests yet. Built-in answers use none.</p> }
            <button type="button" class="btn" (click)="os.openTool('trace')"><app-icon name="server" [size]="15" /> Full trace viewer</button>
          }
          @for (m of maps; track m.key) {
            @if (mk() === m.key) {
              <p class="note">{{ m.note }}</p>
              <div class="map">
                @for (row of m.rows; track $index; let last = $last) {
                  <div class="row">
                    @for (n of row; track n.id) {
                      <button type="button" class="node" [class.on]="sel()?.id === n.id" (click)="sel.set(n)">
                        <span class="n-ico"><app-icon [name]="n.icon" [size]="17" /></span>
                        <span class="n-txt"><b>{{ n.name }}</b><small class="mono">{{ n.sub }}</small></span>
                      </button>
                    }
                  </div>
                  @if (!last) { <div class="flow" aria-hidden="true"><i></i></div> }
                }
              </div>
              <div class="info" aria-live="polite">
                @if (sel(); as n) { <b>{{ n.name }}</b> — {{ n.info }} } @else { <span class="mono">Tap any block to see what it does.</span> }
              </div>
            }
          }
        </div>
  `,
  styles: `
    .inner { padding: 22px 24px 28px; }
    .readouts { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.74rem; color: var(--ink-2); }
    .readouts span { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; border: 1px solid var(--line-2); }
    .ok { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 8px var(--teal); }
    .nums { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 10px 0 14px; } .nums div { padding: 14px; border-radius: 16px; border: 1px solid var(--line); background: var(--glass-2); } .nums b { display: block; font-size: 1.15rem; } .nums span { font-size: 0.78rem; color: var(--ink-2); }
    .now { padding: 13px 16px; border-radius: 16px; border: 1px solid var(--line-2); margin-bottom: 14px; display: grid; gap: 6px; font-size: 0.9rem; } .now p { display: flex; align-items: center; gap: 8px; } .now .fail { color: #f87171; }
    details { border: 1px solid var(--line); border-radius: 14px; padding: 11px 15px; margin-bottom: 8px; } summary { cursor: pointer; overflow-wrap: anywhere; } summary span { font-size: 0.72rem; color: var(--ink-2); }
    ol { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 7px; } li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 12px; font-size: 0.84rem; } li i { grid-column: 1 / -1; grid-row: 2; height: 4px; min-width: 3px; border-radius: 3px; background: linear-gradient(90deg, var(--violet), var(--accent)); } li.bad span { color: #f87171; } li small { color: var(--ink-2); font-size: 0.72rem; }
    .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 18px 0 8px; }
    .tabs button { padding: 9px 16px; border-radius: 999px; border: 1px solid var(--line-2); background: none; cursor: pointer; font-weight: 600; font-size: 0.86rem; }
    .tabs button.on { background: var(--violet); border-color: var(--violet); color: #fff; }
    .note { color: var(--ink-3); font-size: 0.9rem; margin-bottom: 18px; }
    .map { display: grid; justify-items: center; padding: 20px; border-radius: 22px; background-image: radial-gradient(var(--line-2) 1px, transparent 1px); background-size: 20px 20px; border: 1px solid var(--line); }
    .row { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
    .node { display: flex; align-items: center; gap: 10px; min-width: 200px; padding: 12px 14px; border-radius: 16px; cursor: pointer; text-align: left; background: var(--solid); border: 1px solid var(--line-2); transition: all 0.2s; }
    .node:hover { border-color: var(--accent); transform: translateY(-2px); }
    .node.on { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent); }
    .n-ico { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--accent), var(--violet)); flex-shrink: 0; }
    .n-txt { display: flex; flex-direction: column; }
    .n-txt b { font-size: 0.92rem; }
    .n-txt small { color: var(--ink-3); font-size: 0.68rem; }
    .flow { position: relative; width: 2px; height: 34px; background: var(--line-2); overflow: hidden; }
    .flow i { position: absolute; left: -2px; width: 6px; height: 10px; border-radius: 3px; background: var(--accent); animation: down 1.2s linear infinite; }
    @keyframes down { from { top: -10px; } to { top: 34px; } }
    .info { margin-top: 16px; padding: 16px 18px; border-radius: 16px; background: color-mix(in srgb, var(--accent) 8%, transparent); border: 1px solid var(--line); color: var(--ink-2); min-height: 56px; }
    .info b { color: var(--ink); }
    @media (max-width: 560px) { .node { min-width: 0; width: 100%; } .row { width: 100%; } }
  `,
})
export class Monitor implements OnInit, OnDestroy {
  protected readonly theme = inject(ThemeService);
  protected readonly kai = inject(KaiService);
  protected readonly os = inject(OsService);
  protected readonly runs = inject(TraceStore).runs;
  protected readonly daily = DAILY_REQUESTS;
  protected readonly tokens = computed(() => this.runs().flatMap(r => r.steps).reduce((n, s) => n + (s.tokensIn ?? 0) + (s.tokensOut ?? 0), 0).toLocaleString());
  protected readonly status = computed(() => (this.kai.cloud.aiOnline() ? 'Gemini' : this.kai.device.state() === 'ready' ? 'On-device AI' : 'Built-in answers'));
  protected readonly maps = MAPS;
  protected readonly mk = signal('site');
  protected readonly sel = signal<Node | null>(null);
  protected readonly fps = signal(0);
  protected readonly vw = signal(`${innerWidth}×${innerHeight}`);
  protected readonly load = Math.round((performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.domContentLoadedEventEnd ?? performance.now());
  protected readonly gl = 'WebGL2RenderingContext' in window ? 'webgl2' : 'webgl1';
  private raf = 0;

  ngOnInit() {
    let frames = 0, t0 = performance.now();
    const loop = (now: number) => {
      frames++;
      if (now - t0 >= 500) { this.fps.set(Math.round((frames * 1000) / (now - t0))); frames = 0; t0 = now; this.vw.set(`${innerWidth}×${innerHeight}`); }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
  }
}
