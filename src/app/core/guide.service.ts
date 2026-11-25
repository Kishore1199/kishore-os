import { Injectable, Injector, effect, inject, signal, untracked } from '@angular/core';
import { APP, AssistantBus, SECTIONS, SectionId } from './assistant.bus';
import { AssistantService } from './assistant.service';
import { projectStory } from './assistant.brain';
import { evidence } from './evidence';
import { OsService } from './os.service';
import { VisitorMemory } from './visitor-memory.service';
import { PROJECTS } from '../data/portfolio.data';

export interface Nudge { section: SectionId; text: string; action: string; run: () => void; }

const LINGER_MS = 18_000;
const GAP_MS = 45_000;
const MAX_NUDGES = 3;
const SHOW_MS = 14_000;

/** Offers help when a visitor lingers in a window. No AI, at most three offers per visit, two dismissals end it. */
@Injectable({ providedIn: 'root' })
export class GuideService {
  private bus = inject(AssistantBus);
  private os = inject(OsService);
  private injector = inject(Injector);
  private kai = inject(AssistantService);
  private memory = inject(VisitorMemory);
  readonly nudge = signal<Nudge | null>(null);
  private offered = new Set<SectionId>();
  private dismissed = 0;
  private at: SectionId | null = null;
  private since = 0;
  private quietUntil = 0;
  private hideT?: ReturnType<typeof setTimeout>;

  /** Starts watching; returns a function that stops. */
  start(): () => void {
    const ref = effect(() => {
      const f = this.os.focused();
      untracked(() => {
        const now = SECTIONS.find(s => APP[s] === f && s !== 'home') ?? null;
        if (now !== this.at) { this.at = now; this.since = Date.now(); if (this.nudge() && this.nudge()!.section !== now) this.close(); }
      });
    }, { injector: this.injector });
    const timer = setInterval(() => this.tick(), 2000);
    return () => { ref.destroy(); clearInterval(timer); clearTimeout(this.hideT); };
  }

  accept() {
    const n = this.nudge();
    this.close();
    n?.run();
  }

  dismiss() {
    this.dismissed++;
    this.close();
  }

  private tick() {
    const busy = document.hidden || this.kai.chatOpen() || this.kai.voice.speaking() || this.kai.voice.listening() || this.kai.thinking() || this.kai.tourStep() >= 0
      || !!document.querySelector('dialog[open], [aria-modal="true"]') || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
    if (busy) { this.since = Date.now(); if (this.nudge()) this.close(); return; }
    const id = this.at;
    if (!id || this.nudge() || this.offered.has(id) || this.offered.size >= MAX_NUDGES || this.dismissed >= 2) return;
    if (Date.now() - this.since < LINGER_MS || Date.now() < this.quietUntil) return;
    this.offered.add(id);
    this.nudge.set({ section: id, ...this.offer(id) });
    this.hideT = setTimeout(() => this.close(), SHOW_MS);
  }

  private close() {
    clearTimeout(this.hideT);
    this.quietUntil = Date.now() + GAP_MS;
    this.nudge.set(null);
  }

  private offer(id: SectionId): Omit<Nudge, 'section'> {
    const match = { text: 'Hiring? Paste a job description and I’ll check the match, gaps included.', action: 'Match a job', run: () => this.bus.openMatcher() };
    const interview = { text: 'Want a quick mock interview from these notes?', action: 'Start', run: () => this.bus.openInterview() };
    switch (id) {
      case 'home': case 'about': return this.memory.role() === 'recruiter' ? match : { text: 'New here? I can walk you through the highlights.', action: 'Start the tour', run: () => void this.kai.tour() };
      case 'skills': {
        const liked = this.memory.interests().find(x => evidence(x).projects.length);
        const p = PROJECTS.find(x => liked && x.title === evidence(liked).projects[0]) ?? PROJECTS[0];
        return { text: liked ? `You asked about ${liked}. Want to see the project behind it?` : 'Want to see the project behind these skills?', action: p.title, run: () => { this.bus.showProject(p.title); void this.bus.go('projects'); } };
      }
      case 'projects': {
        const title = PROJECTS.find(p => p.title === this.bus.front())?.title ?? PROJECTS[0].title;
        return { text: `Shall I tell you the story behind ${title}?`, action: 'Tell me', run: () => this.kai.explain('projects', projectStory(title)) };
      }
      case 'contact': return { text: 'Not sure what to write? Tell me the gist and I’ll draft it. You press Send.', action: 'Draft it', run: () => this.bus.startDraft() };
      case 'prep': case 'education': return interview;
      default: return match;
    }
  }
}
