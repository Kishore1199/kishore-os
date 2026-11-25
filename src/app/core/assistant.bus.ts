import { Injectable, inject, signal } from '@angular/core';
import type { LabId } from '../lab/lab-ids';
import { AppId, OsService } from './os.service';

/** The same names the 3D site uses, so the shared AI files need no changes. */
export type SectionId = 'home' | 'about' | 'skills' | 'projects' | 'experience' | 'education' | 'prep' | 'ai' | 'contact';
export const SECTIONS: SectionId[] = ['home', 'about', 'skills', 'projects', 'experience', 'education', 'prep', 'ai', 'contact'];

/** which window each "section" is on Kishore.OS */
export const APP: Record<SectionId, AppId> = { home: 'about', about: 'about', skills: 'skills', projects: 'projects', experience: 'experience', education: 'experience', prep: 'notes', ai: 'ailab', contact: 'contact' };

/** Adapter: what the shared AI code asks for, done with Kishore.OS windows. */
@Injectable({ providedIn: 'root' })
export class AssistantBus {
  private os = inject(OsService);
  readonly emote = this.os.emote;
  /** the OS shows its own toast */
  readonly toast = signal('');
  readonly focus = signal<SectionId | null>(null);
  readonly project = signal<{ title: string; n: number } | null>(null);
  readonly matcher = signal<{ text: string } | null>(null);
  readonly interview = signal(false);
  readonly interviewGroup = signal('');
  /** tools are windows here, so nothing is ever "open over" the page */
  readonly lab = signal<{ id: LabId; seed: Record<string, string> } | null>(null);
  readonly draft = signal<{ subject: string; message: string; n: number } | null>(null);
  readonly draftStart = signal(0);
  /** the contact window can be opened after a draft was made: each draft is used once */
  usedDraft = 0;
  usedStart = 0;
  readonly front = signal('');
  readonly slides = signal<{ cmd: 'next' | 'prev' | 'pause' | 'play'; n: number } | null>(null);
  private n = 0;
  private showT?: ReturnType<typeof setTimeout>;

  react(mood: string, ms = 1800) { this.os.react(mood, ms); }
  notify(msg: string) { this.os.notify(msg); }

  /** Open the window (instead of scrolling). Resolves once it has settled. */
  go(id: SectionId): Promise<void> {
    this.os.open(APP[id]);
    this.focus.set(id);
    return new Promise(r => setTimeout(r, 450));
  }
  /** when a project was last asked for, so a window that opens because of it starts there */
  askedAt = 0;
  showProject(title: string) { this.askedAt = Date.now(); this.project.set({ title, n: ++this.n }); this.os.open('projects'); }
  slide(cmd: 'next' | 'prev' | 'pause' | 'play') { this.slides.set({ cmd, n: ++this.n }); }
  openMatcher(text = '') { this.matcher.set({ text }); }
  openLab(id: LabId, seed: Record<string, string> = {}) { this.os.openTool(id, seed); }
  openInterview(group = '') { this.interviewGroup.set(group); this.interview.set(true); }
  startDraft() { void this.go('contact').then(() => this.draftStart.update(n => n + 1)); }
  fillDraft(subject: string, message: string) { this.draft.set({ subject, message, n: ++this.n }); void this.go('contact'); }
  perform(moods: readonly string[], ms: number) {
    clearTimeout(this.showT);
    const step = (i: number) => { if (i >= moods.length) return; this.react(moods[i], ms + 100); this.showT = setTimeout(() => step(i + 1), ms); };
    step(0);
  }
  /** Resolves to whether the browser really allowed the copy. */
  async copy(text: string, what: string): Promise<boolean> {
    try { await navigator.clipboard.writeText(text); this.notify(`${what} copied to clipboard`); this.react('party', 2000); return true; }
    catch { this.notify(text); return false; }
  }
}
