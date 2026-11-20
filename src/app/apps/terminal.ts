import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, effect, inject, signal, viewChild } from '@angular/core';
import { KaiService } from '../core/kai.service';
import { answer } from '../core/kai.brain';
import { APPS, AppId, OsService } from '../core/os.service';
import { ThemeService } from '../core/theme.service';
import { EDUCATION, EXPERIENCE, PROFILE, PROJECTS, SKILL_CATEGORIES } from '../data/portfolio.data';
import { STUDY_GUIDES } from '../data/study.data';

interface Line { k: 'in' | 'out' | 'err' | 'ok' | 'art'; t: string; }

const COMMANDS = ['help', 'whoami', 'about', 'ls', 'open', 'projects', 'skills', 'experience', 'education', 'contact', 'email', 'resume', 'notes', 'theme', 'tour', 'say', 'alpha', 'date', 'echo', 'history', 'clear', 'exit', 'sudo'];

@Component({
  selector: 'app-terminal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="term mono" (click)="focus()" #scroll>
      @for (l of lines(); track $index) { <pre [class]="l.k">{{ l.t }}</pre> }
      <label class="prompt">
        <span class="ps"><b>kishore</b>@<i>os</i>:~$</span>
        <input #inp [value]="cur()" (input)="cur.set($any($event.target).value)" (keydown)="key($event)" spellcheck="false" autocomplete="off" aria-label="Terminal input" />
      </label>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .term { height: 100%; overflow-y: auto; padding: 16px 18px; font-size: 0.84rem; line-height: 1.6; background: color-mix(in srgb, #05040c 85%, transparent); color: #d7d3f5; cursor: text; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; font: inherit; }
    .in { color: #fff; } .in::before { content: '❯ '; color: #ff7a3d; }
    .err { color: #fb7185; } .ok { color: #5eead4; } .art { color: #c4b5fd; line-height: 1.35; }
    .prompt { display: flex; gap: 8px; align-items: center; }
    .ps b { color: #5eead4; font-weight: 700; } .ps i { font-style: normal; color: #c4b5fd; }
    input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; color: #fff; font: inherit; caret-color: #ff7a3d; }
  `,
})
export class Terminal {
  private os = inject(OsService);
  private kai = inject(KaiService);
  private theme = inject(ThemeService);
  private inp = viewChild.required<ElementRef<HTMLInputElement>>('inp');
  private scroll = viewChild.required<ElementRef<HTMLElement>>('scroll');
  protected readonly cur = signal('');
  protected readonly lines = signal<Line[]>([
    { k: 'ok', t: 'Kishore.OS terminal · kv-sh 3.0 · ALPHA on board' },
    { k: 'out', t: 'Type "alpha" for the system card or "help" for every command. Tab completes, ↑/↓ walks history.' },
  ]);
  private hist: string[] = [];
  private hi = -1;

  constructor() {
    afterNextRender(() => this.focus());
    effect(() => { this.lines(); const el = this.scroll()?.nativeElement; if (el) queueMicrotask(() => (el.scrollTop = el.scrollHeight)); });
  }

  protected focus() {
    if (!getSelection()?.toString()) this.inp().nativeElement.focus({ preventScroll: true });
  }

  protected key(e: KeyboardEvent) {
    if (e.key === 'Enter') { const c = this.cur(); this.cur.set(''); this.inp().nativeElement.value = ''; this.run(c); }
    else if (e.key === 'ArrowUp' && this.hist.length) { e.preventDefault(); this.hi = Math.min(this.hi + 1, this.hist.length - 1); this.cur.set(this.hist[this.hist.length - 1 - this.hi]); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); this.hi = Math.max(this.hi - 1, -1); this.cur.set(this.hi < 0 ? '' : this.hist[this.hist.length - 1 - this.hi]); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const [cmd, ...rest] = this.cur().split(' ');
      if (!rest.length) { const m = COMMANDS.filter(c => c.startsWith(cmd)); if (m.length === 1) this.cur.set(m[0] + ' '); else if (m.length) this.out(m.join('  ')); }
      else if (cmd === 'open') { const m = APPS.map(a => a.id).filter(a => a.startsWith(rest.join(' '))); if (m.length === 1) this.cur.set('open ' + m[0]); else if (m.length) this.out(m.join('  ')); }
    } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); this.lines.set([]); }
  }

  private out(t: string, k: Line['k'] = 'out') { this.lines.update(l => [...l, { k, t }]); }

  private run(raw: string) {
    const line = raw.trim();
    this.out(line, 'in');
    if (!line) return;
    this.hist.push(line); this.hi = -1;
    const [cmd, ...args] = line.split(/\s+/);
    const arg = args.join(' ');
    const c = cmd.toLowerCase();
    const pad = (s: string, n: number) => s.padEnd(n);
    switch (c) {
      case 'help':
        return this.out([
          'whoami            who is Kishore',
          'ls [apps|projects|skills]',
          'open <app>        open a window  (' + APPS.map(a => a.id).join(', ') + ')',
          'projects          list projects with links',
          'skills [filter]   list skills',
          'experience        work history',
          'education         degrees',
          'notes <topic>     find an interview-prep chapter',
          'contact | email   contact details / copy email',
          'resume            open the resume',
          'theme [dark|light]',
          'tour              start ALPHA\'s voice tour',
          'say <text>        ALPHA reads it out loud',
          'alpha             system card (logo + specs)',
          'alpha <question>  ask ALPHA anything',
          'date · echo · history · clear · exit',
        ].join('\n'));
      case 'whoami': case 'about':
        return this.out(`${PROFILE.name} — ${PROFILE.role}\n${PROFILE.location}\n3+ years · currently ${EXPERIENCE[0].role} @ ${EXPERIENCE[0].company}`);
      case 'ls': {
        const what = arg || 'apps';
        if (what.startsWith('proj')) return this.out(PROJECTS.map(p => `drwxr-xr-x  ${pad(p.title, 26)} ${p.badge}`).join('\n'));
        if (what.startsWith('skill')) return this.out(SKILL_CATEGORIES.map(s => `${pad(s.name + '/', 20)} ${s.skills.length} items`).join('\n'));
        return this.out(APPS.map(a => a.id + (a.id === 'resume' ? '.pdf' : '/')).join('   '));
      }
      case 'open': {
        const app = APPS.find(a => a.id === arg.toLowerCase() || a.title.toLowerCase() === arg.toLowerCase());
        if (!app) return this.out(`open: no such app "${arg}". Try: ${APPS.map(a => a.id).join(', ')}`, 'err');
        this.os.open(app.id as AppId);
        return this.out(`opening ${app.title}…`, 'ok');
      }
      case 'projects':
        return this.out(PROJECTS.map(p => `• ${pad(p.title, 26)} ${pad(p.period, 20)} ${p.link ?? '(internship)'}`).join('\n'));
      case 'skills': {
        const q = arg.toLowerCase();
        return this.out(SKILL_CATEGORIES.map(s => { const xs = s.skills.filter(x => !q || x.name.toLowerCase().includes(q)); return xs.length ? `${s.name}: ${xs.map(x => x.name).join(', ')}` : ''; }).filter(Boolean).join('\n') || `no skill matching "${arg}"`);
      }
      case 'experience':
        return this.out(EXPERIENCE.map(e => `${e.period.padEnd(20)} ${e.role} @ ${e.company}`).join('\n'));
      case 'education':
        return this.out([...EDUCATION].reverse().map(e => `${e.period.padEnd(13)} ${e.degree} — ${e.grade}`).join('\n'));
      case 'notes': {
        if (!arg) return this.out('usage: notes <topic>   e.g. notes jwt', 'err');
        const hits = STUDY_GUIDES.flatMap(g => g.topics.filter(t => t.title.toLowerCase().includes(arg.toLowerCase())).map(t => ({ g, t })));
        if (!hits.length) return this.out(`no chapter matching "${arg}"`, 'err');
        hits.slice(0, 8).forEach(h => this.out(`📘 ${h.t.title} (${h.g.short}, ${h.t.questions} Qs)`));
        window.open(`${hits[0].g.file}#${hits[0].t.id}`, '_blank', 'noopener');
        return this.out('opened the first match in a new tab', 'ok');
      }
      case 'contact':
        return this.out(`email    ${PROFILE.email}\nphone    ${PROFILE.phone}\nlinkedin ${PROFILE.linkedin}\ngithub   ${PROFILE.github}`);
      case 'email':
        this.os.copy(PROFILE.email, 'Email');
        return this.out(`${PROFILE.email} — copied to clipboard`, 'ok');
      case 'resume':
        this.os.open('resume');
        return this.out('opening Resume.pdf…', 'ok');
      case 'theme': {
        const want = arg === 'dark' ? true : arg === 'light' ? false : !this.theme.isDark();
        if (want !== this.theme.isDark()) this.theme.toggle();
        return this.out(`theme set to ${want ? 'dark' : 'light'}`, 'ok');
      }
      case 'tour':
        this.kai.tour();
        return this.out('ALPHA is starting the tour 🔊', 'ok');
      case 'say':
        if (!arg) return this.out('usage: say <text>', 'err');
        this.kai.say(arg);
        return this.out('🔊 ' + arg, 'ok');
      case 'alpha': case 'kai': {
        if (!arg) return this.out(
          `   ██╗      ██╗        kishore@os\n   ██║    ██╔╝ ●      ──────────\n   ██║  ██╔╝          OS        Kishore.OS 3.0 (Angular 22, zoneless)\n   ██║██╔╝            Guide     ALPHA voice assistant\n   ████╔╝             Role      ${PROFILE.role}\n   ██║██╗             Uptime    3+ years\n   ██║  ██╗           Backend   Java 21 · Spring Boot · Hibernate\n   ██║    ██╗         Frontend  Angular · TypeScript\n   ██║      ██╗       Data      MySQL · MongoDB\n   ╚═╝      ╚═╝       Packages  ${SKILL_CATEGORIES.reduce((n, c) => n + c.skills.length, 0)} skills\n                      Location  ${PROFILE.location}\n                      Status    open to work ●`, 'art');
        const r = answer(arg);
        this.kai.say(r.text);
        if (r.open) this.os.open(r.open);
        return this.out('alpha › ' + r.text, 'ok');
      }
      case 'date':
        return this.out(new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeStyle: 'long', timeZone: 'Asia/Kolkata' }).format(new Date()));
      case 'echo':
        return this.out(arg);
      case 'history':
        return this.out(this.hist.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`).join('\n'));
      case 'clear':
        return this.lines.set([]);
      case 'exit':
        return this.os.close('terminal');
      case 'sudo':
        if (/hire/i.test(arg)) { this.os.open('contact'); this.kai.say('Excellent decision. Opening the contact form.'); return this.out('[sudo] permission granted ✔  opening contact…', 'ok'); }
        return this.out('kishore is not in the sudoers file. This incident will be reported 😄  (try: sudo hire kishore)', 'err');
      default:
        return this.out(`kv-sh: command not found: ${cmd}. Type "help".`, 'err');
    }
  }
}
