import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Icon } from '../core/icon';
import { Logo } from '../core/logo';
import { KaiService } from '../core/kai.service';
import { OsService, appDef } from '../core/os.service';
import { ThemeService } from '../core/theme.service';
import { PROFILE } from '../data/portfolio.data';

@Component({
  selector: 'app-menubar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Logo],
  template: `
    <header class="bar">
      <button type="button" class="logo" (click)="menu.set(!menu())" [attr.aria-expanded]="menu()" aria-label="Kishore.OS menu">
        <app-logo [size]="24" /><b>Kishore<span class="os">.OS</span></b>
      </button>
      <span class="app">{{ title() }}</span>
      @if (menu()) {
        <div class="drop" role="menu" (click)="menu.set(false)">
          <button type="button" role="menuitem" (click)="os.open('about')"><app-icon name="user" [size]="14" /> About Kishore</button>
          <button type="button" role="menuitem" (click)="kai.tour()"><app-icon name="volume" [size]="14" /> Start voice tour</button>
          <button type="button" role="menuitem" (click)="os.spotlight.set(true)"><app-icon name="search" [size]="14" /> Spotlight search <kbd>Ctrl K</kbd></button>
          <button type="button" role="menuitem" (click)="os.open('monitor')"><app-icon name="activity" [size]="14" /> System monitor</button>
          <a role="menuitem" [href]="p.resume" download><app-icon name="download" [size]="14" /> Download resume</a>
          <hr />
          <button type="button" role="menuitem" (click)="os.closeAll()"><app-icon name="close" [size]="14" /> Close all windows</button>
          <button type="button" role="menuitem" (click)="reboot()"><app-icon name="refresh" [size]="14" /> Restart</button>
        </div>
      }
      <div class="right">
        <span class="status mono"><i></i> Open to work</span>
        <button type="button" class="ic" (click)="os.spotlight.set(true)" aria-label="Search (Ctrl K)"><app-icon name="search" [size]="15" /></button>
        <button type="button" class="ic" (click)="kai.voice.toggle()" [attr.aria-label]="kai.voice.enabled() ? 'Mute ALPHA' : 'Unmute ALPHA'" [attr.aria-pressed]="kai.voice.enabled()">
          <app-icon [name]="kai.voice.enabled() ? 'volume' : 'volume-x'" [size]="15" />
        </button>
        <button type="button" class="ic" (click)="theme.toggle()" aria-label="Toggle theme"><app-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="15" /></button>
        <span class="clock mono" [attr.title]="'Chennai time (IST)'">{{ clock() }}</span>
      </div>
    </header>
  `,
  styles: `
    .bar { position: fixed; inset: 0 0 auto; z-index: 200; height: 40px; display: flex; align-items: center; gap: 14px; padding: 0 10px 0 8px;
      background: color-mix(in srgb, var(--solid) 55%, transparent); backdrop-filter: blur(20px) saturate(1.4); border-bottom: 1px solid var(--line); font-size: 0.84rem; }
    .logo { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border-radius: 8px; border: 0; background: none; cursor: pointer; }
    .logo:hover, .logo[aria-expanded='true'] { background: var(--glass-2); }
    .os { color: var(--accent); }
    .logo b { font-family: var(--display); font-weight: 700; }
    .app { font-weight: 600; color: var(--ink-2); }
    .drop { position: absolute; top: 44px; left: 8px; min-width: 250px; padding: 6px; border-radius: 14px; background: var(--solid); border: 1px solid var(--line-2); box-shadow: var(--shadow); display: grid; animation: fade-up 0.15s; }
    .drop button, .drop a { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; border: 0; background: none; text-align: left; cursor: pointer; text-decoration: none; font-size: 0.86rem; }
    .drop button:hover, .drop a:hover { background: var(--accent); color: #fff; }
    .drop kbd { margin-left: auto; font: 500 0.68rem var(--mono); opacity: 0.7; }
    .drop hr { border: 0; border-top: 1px solid var(--line); margin: 4px 6px; }
    .right { margin-left: auto; display: flex; align-items: center; gap: 4px; }
    .status { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; margin-right: 6px; border-radius: 999px; font-size: 0.7rem; color: var(--teal); border: 1px solid color-mix(in srgb, var(--teal) 40%, transparent); }
    .status i { width: 7px; height: 7px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 8px var(--teal); }
    .ic { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; border: 0; background: none; cursor: pointer; }
    .ic:hover { background: var(--glass-2); }
    .clock { padding: 0 8px; font-size: 0.78rem; white-space: nowrap; }
    @media (max-width: 760px) { .app, .status, .logo b { display: none; } }
  `,
})
export class Menubar implements OnInit, OnDestroy {
  protected readonly os = inject(OsService);
  protected readonly kai = inject(KaiService);
  protected readonly theme = inject(ThemeService);
  protected readonly p = PROFILE;
  protected readonly menu = signal(false);
  protected readonly clock = signal('');
  protected readonly title = computed(() => { const f = this.os.focused(); return f ? appDef(f).title : 'Desktop'; });
  private t?: ReturnType<typeof setInterval>;

  ngOnInit() {
    const fmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    const tick = () => this.clock.set(fmt.format(new Date()) + ' IST');
    tick();
    this.t = setInterval(tick, 15000);
  }
  ngOnDestroy() {
    clearInterval(this.t);
  }
  protected reboot() {
    try { sessionStorage.removeItem('kv-booted'); } catch { /* ignore */ }
    location.href = location.pathname;
  }
}
