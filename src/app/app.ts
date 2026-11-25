import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from './core/icon';
import { KaiService } from './core/kai.service';
import { OsService, WinId, toolOf, winId } from './core/os.service';
import { SessionService } from './core/session.service';
import { Wallpaper } from './shell/wallpaper';
import { Boot } from './shell/boot';
import { Menubar } from './shell/menubar';
import { Desktop } from './shell/desktop';
import { Dock } from './shell/dock';
import { WindowFrame } from './shell/window';
import { Assistant } from './layout/assistant';
import { Notifications } from './shell/notifications';
import { Spotlight } from './shell/spotlight';
import { About } from './apps/about';
import { Projects } from './apps/projects';
import { Experience } from './apps/experience';
import { Skills } from './apps/skills';
import { Notes } from './apps/notes';
import { Terminal } from './apps/terminal';
import { Contact } from './apps/contact';
import { Arcade } from './apps/arcade';
import { Monitor } from './apps/monitor';
import { Resume } from './apps/resume';
import { Guestbook } from './apps/guestbook';
import { AiCatalog } from './sections/ai-catalog';
import { Files } from './apps/files';
import { WallpaperApp } from './apps/wallpaper-app';
import { LabDialog } from './lab/lab-dialog';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Wallpaper, Boot, Menubar, Desktop, Dock, WindowFrame, Assistant, Notifications, AiCatalog, Files, WallpaperApp, LabDialog, Spotlight, About, Projects, Experience, Skills, Notes, Terminal, Contact, Arcade, Monitor, Resume, Guestbook],
  host: { '(document:keydown)': 'key($event)', '(window:hashchange)': 'hash()' },
  template: `
    <app-wallpaper />
    <app-boot />
    @if (os.booted()) {
      <app-menubar />
      <app-desktop />
      @for (w of os.wins(); track w.id) {
        <app-window [win]="w">
          @switch (w.id) {
            @case ('about') { <app-about /> }
            @case ('projects') { <app-projects /> }
            @case ('experience') { <app-experience /> }
            @case ('skills') { <app-skills /> }
            @case ('notes') { <app-notes /> }
            @case ('terminal') { <app-terminal /> }
            @case ('contact') { <app-contact /> }
            @case ('games') { <app-arcade /> }
            @case ('monitor') { <app-monitor /> }
            @case ('resume') { <app-resume /> }
            @case ('guestbook') { <app-guestbook /> }
            @case ('ailab') { @defer (on immediate) { <div class="ailab"><app-ai-catalog /></div> } }
            @case ('wallpaper') { @defer (on immediate) { <app-wallpaper-app /> } }
            @case ('files') { @defer (on immediate) { <app-files /> } }
            @default { @if (tool(w.id); as t) { @defer (on immediate) { <app-lab [id]="t" [seed]="os.seeds.get(w.id) ?? {}" (close)="os.close(w.id)" /> } @loading { <p class="wait mono">Opening…</p> } } }
          }
        </app-window>
      }
      <app-dock />
      <app-assistant />
      <app-notifications />
      @if (os.spotlight()) { <app-spotlight /> }
    }
    @if (os.toast()) { <div class="toast" role="status"><app-icon name="check" [size]="14" /> {{ os.toast() }}</div> }
  `,
  styles: `
    .wait { padding: 22px; color: var(--ink-2); }
    .toast { position: fixed; left: 50%; top: 54px; z-index: 600; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 12px;
      background: var(--ink); color: var(--bg); font: 600 0.8rem var(--mono); box-shadow: var(--shadow); animation: fade-up 0.25s; }
  `,
})
export class App {
  protected readonly os = inject(OsService);
  private kai = inject(KaiService);
  protected readonly tool = (id: WinId) => toolOf(id);

  constructor() {
    inject(SessionService); // remembers the open windows
  }

  protected key(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); this.os.spotlight.update(v => !v); return; }
    if (e.key === 'Escape') {
      if (this.os.spotlight()) this.os.spotlight.set(false);
      else if (this.kai.chatOpen()) this.kai.chatOpen.set(false);
      else if (this.kai.voice.speaking()) this.kai.stopTour();
      return;
    }
    const t = e.target instanceof Element ? e.target : null;
    if (e.key === '/' && !t?.closest('input, textarea') && this.os.booted()) { e.preventDefault(); this.os.spotlight.set(true); }
  }

  protected hash() {
    const id = winId(location.hash.slice(1)); // tools: LabRouter
    if (this.os.booted() && id) this.os.open(id);
  }
}
