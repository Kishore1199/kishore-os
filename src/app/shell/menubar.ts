import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Icon } from '../core/icon';
import { Logo } from '../core/logo';
import { KaiService } from '../core/kai.service';
import { OsService, appDef } from '../core/os.service';
import { ThemeService } from '../core/theme.service';
import { NotificationService } from '../core/notification.service';
import { PetService } from '../core/pet.service';
import { WallpaperMood } from '../core/wallpaper-mood.service';
import { LANGS } from '../core/language.service';
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
          <button type="button" role="menuitem" (click)="os.open('guestbook')"><app-icon name="message" [size]="14" /> Guestbook</button>
          <button type="button" role="menuitem" (click)="os.open('monitor')"><app-icon name="activity" [size]="14" /> System monitor</button>
          <button type="button" role="menuitem" (click)="os.open('ailab')"><app-icon name="spark" [size]="14" /> AI Lab</button>
          <button type="button" role="menuitem" (click)="os.open('files')"><app-icon name="folder" [size]="14" /> Files</button>
          <a role="menuitem" [href]="p.resume" download><app-icon name="download" [size]="14" /> Download resume</a>
          <hr />
          <button type="button" role="menuitem" (click)="os.tile() || os.notify('Open some windows first')"><app-icon name="grid" [size]="14" /> Tile windows</button>
          <button type="button" role="menuitem" (click)="os.cascade() || os.notify('Open some windows first')"><app-icon name="layers" [size]="14" /> Stack windows</button>
          <button type="button" role="menuitemcheckbox" [attr.aria-checked]="pet.on()" (click)="pet.set(!pet.on())"><app-icon name="bot" [size]="14" /> Let ALPHA walk <kbd>{{ pet.on() ? 'on' : 'off' }}</kbd></button>
          <button type="button" role="menuitemcheckbox" [attr.aria-checked]="mood.on()" (click)="mood.toggle()"><app-icon name="sun" [size]="14" /> Wallpaper mood <kbd>{{ mood.on() ? 'on' : 'off' }}</kbd></button>
          <button type="button" role="menuitem" (click)="os.closeAll()"><app-icon name="close" [size]="14" /> Close all windows</button>
          <button type="button" role="menuitem" (click)="reboot()"><app-icon name="refresh" [size]="14" /> Restart</button>
        </div>
      }
      <div class="right">
        <button type="button" class="ai mono" [attr.data-s]="ai().key" (click)="os.open('monitor')" [title]="ai().title"><i></i>{{ ai().label }}</button>
        <select class="lang" aria-label="ALPHA's answer language" (change)="kai.lang.set($any($event.target).value)">@for (l of langs; track l.id) { <option [value]="l.id" [selected]="kai.lang.lang() === l.id">{{ l.label }}</option> }</select>
        <span class="status mono"><i></i> Open to work</span>
        <button type="button" class="ic" (click)="os.spotlight.set(true)" aria-label="Search (Ctrl K)"><app-icon name="search" [size]="15" /></button>
        @if (kai.voice.canListen) {
          <button type="button" class="ic" [class.wake]="kai.voice.wakeOn()" (click)="kai.toggleWake()" [attr.aria-pressed]="kai.voice.wakeOn()" [attr.aria-label]="kai.voice.wakeOn() ? 'Turn off Alpha wake word' : 'Turn on Alpha wake word'" [title]="kai.voice.wakeOn() ? 'Listening for “Alpha” — click to turn off' : 'Turn on “Alpha” wake word'"><app-icon name="mic" [size]="15" /></button>
        }
        <button type="button" class="ic" (click)="kai.voice.toggle()" [attr.aria-label]="kai.voice.enabled() ? 'Mute ALPHA' : 'Unmute ALPHA'" [attr.aria-pressed]="kai.voice.enabled()">
          <app-icon [name]="kai.voice.enabled() ? 'volume' : 'volume-x'" [size]="15" />
        </button>
        <button type="button" class="ic bell" (click)="notes.toggle()" [attr.aria-expanded]="notes.open()" [attr.aria-label]="notes.unread() ? 'Notifications, ' + notes.unread() + ' new' : 'Notifications'"><app-icon name="bell" [size]="15" />@if (notes.unread()) { <b>{{ notes.unread() }}</b> }</button>
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
    .ic.wake { color: var(--teal); background: color-mix(in srgb, var(--teal) 16%, transparent); box-shadow: inset 0 0 0 1px var(--teal); }
    .bell { position: relative; } .bell b { position: absolute; top: 1px; right: 0; min-width: 14px; height: 14px; padding: 0 3px; border-radius: 8px; background: #b91c1c; color: #fff; font: 700 0.6rem/14px var(--mono); text-align: center; }
    .ai { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--line-2); background: none; color: var(--ink-2); font-size: 0.7rem; cursor: pointer; } .ai:hover { color: var(--ink); border-color: var(--accent); }
    .ai i { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; } .ai[data-s='on'] i { background: #34d399; } .ai[data-s='device'] i { background: #60a5fa; }
    .lang { height: 26px; padding: 0 6px; border-radius: 999px; border: 1px solid var(--line-2); background: var(--solid); color: var(--ink-2); font-size: 0.72rem; }
    .clock { padding: 0 8px; font-size: 0.78rem; white-space: nowrap; }
    @media (max-width: 1000px) { .status { display: none; } }
    @media (max-width: 760px) { .app, .logo b, .lang { display: none; } .ai { font-size: 0; gap: 0; padding: 7px; border: 0; } }
    @media (max-width: 420px) { .clock { padding: 0 2px; font-size: 0.68rem; } }
  `,
})
export class Menubar implements OnInit, OnDestroy {
  protected readonly os = inject(OsService);
  protected readonly kai = inject(KaiService);
  protected readonly theme = inject(ThemeService);
  protected readonly p = PROFILE;
  protected readonly notes = inject(NotificationService);
  protected readonly pet = inject(PetService);
  protected readonly mood = inject(WallpaperMood);
  protected readonly langs = LANGS;
  protected readonly ai = computed(() => this.kai.cloud.aiOnline() ? { key: 'on', label: 'Gemini', title: 'Gemini answers. Open the System Monitor for details.' }
    : this.kai.device.state() === 'ready' ? { key: 'device', label: 'On device', title: "Chrome's own AI answers." } : { key: 'off', label: 'Offline brain', title: 'Gemini is not available, so ALPHA uses its built-in answers.' });
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
