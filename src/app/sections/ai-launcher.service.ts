import { Injectable, inject } from '@angular/core';
import { AssistantBus } from '../core/assistant.bus';
import { AssistantService } from '../core/assistant.service';
import { NotificationService } from '../core/notification.service';
import { OsService } from '../core/os.service';
import { PetService } from '../core/pet.service';
import { WallpaperMood } from '../core/wallpaper-mood.service';
import { AiFeature, AiGroup } from '../data/ai-features.data';

/** Opens whatever an AI option stands for. */
@Injectable({ providedIn: 'root' })
export class AiLauncher {
  private bus = inject(AssistantBus);
  private kai = inject(AssistantService);
  private os = inject(OsService);
  private pet = inject(PetService);
  private mood = inject(WallpaperMood);
  private notifications = inject(NotificationService);

  run(f: AiFeature) {
    const a = f.action;
    if (!a) return;
    if ('lab' in a) { this.bus.openLab(a.lab); return; }
    if ('win' in a) { this.os.open(a.win); return; }
    switch (a.do) {
      case 'tile': if (!this.os.tile()) this.os.notify(this.os.mobile ? 'Windows fill the screen on a phone' : 'Open some windows first'); break;
      case 'spotlight': this.os.spotlight.set(true); break;
      case 'pet': this.pet.set(!this.pet.on()); this.os.notify(this.pet.on() ? 'ALPHA is going for a walk' : 'ALPHA is back in the corner'); break;
      case 'notifications': this.notifications.toggle(); break;
      case 'wallpaper': this.mood.toggle(); this.os.notify(`Wallpaper mood is ${this.mood.on() ? 'on' : 'off'}`); break;
      case 'chat': this.kai.chatOpen.set(true); break;
      case 'live': this.kai.chatOpen.set(true); void this.kai.startLive(); break;
      case 'tour': void this.kai.tour(); break;
      case 'match': this.bus.openMatcher(); break;
      case 'interview': this.bus.openInterview(); break;
      case 'java-interview': this.bus.openInterview('Core Java'); break;
      case 'draft': this.bus.startDraft(); break;
      case 'wake': this.kai.toggleWake(); break;
      case 'listen': this.kai.explain('ai'); break;
      case 'scroll-notes': this.kai.chatOpen.set(true); void this.kai.ask('How does HashMap work internally?'); break;
    }
  }
}

/** One colour per group, dark then light theme (chosen to stay readable as text). */
export const GROUP_COLOR: Record<AiGroup, [dark: string, light: string]> = {
  'Portfolio AI': ['#fb923c', '#c2410c'],
  'Developer AI Lab': ['#22d3ee', '#0e7490'],
  'Interactive': ['#a78bfa', '#6d28d9'],
  'Behind the scenes': ['#34d399', '#047857'],
};

/** Ready-made paths through the tools. Titles must exist in AI_FEATURES. */
export const PATHS: { label: string; icon: string; line: string; steps: string[] }[] = [
  { label: "I'm hiring", icon: 'briefcase', line: 'From job description to a meeting, in five steps.', steps: ['Job description matcher', 'Hiring panel', 'Skills analysis', 'Recruiter assistant', 'Meeting agent'] },
  { label: "I'm learning", icon: 'grad', line: 'Plan it, understand it, test yourself.', steps: ['Learning roadmap', 'Concept explainer', 'Search by meaning', 'Technical quiz', 'Mock interview'] },
  { label: "I'm building", icon: 'code', line: 'Design it, write it, check it.', steps: ['Microservices designer', 'Spring Boot generator', 'SQL playground', 'Code review', 'Debugging assistant'] },
  { label: 'Just curious', icon: 'spark', line: 'See how the agents think.', steps: ['Personal AI twin', 'Window agent', 'AI terminal', 'Agent team', 'Agent activity'] },
];

/** Words people use that are not in a tool's own text. */
const HINTS: Record<string, string> = {
  'Job description matcher': 'hire hiring recruit vacancy jd fit role candidate', 'Resume analyzer': 'cv resume', 'Resume PDF analysis': 'cv pdf', 'Mock interview': 'practice practise prepare', 'Technical quiz': 'test exam mcq', 'SQL playground': 'database query mysql',
  'Debugging assistant': 'error bug exception fix crash', 'Voice assistant': 'speak mic', 'Live talk': 'speak talk conversation chat', 'Skill detective': 'game play fun', 'Rock, paper, scissors': 'game play fun', 'Code typing race': 'game play fun type', 'Robot studio': 'dance fun robot play', 'Daily challenge': 'game question streak', 'Text to speech': 'listen aloud hear', 'Contact agent': 'email message hire contact', 'Meeting agent': 'call schedule calendar book',
  'Learning roadmap': 'study plan learn', 'Concept explainer': 'teach understand learn', 'Personal AI twin': 'about kishore who', 'Offline app': 'install download', 'Tamil and Hindi': 'language', 'Code review': 'check code quality', 'Skill graph': 'visual', 'GitHub explorer': 'repository code',
};
const SKIP = new Set(['i', 'a', 'an', 'the', 'to', 'my', 'me', 'want', 'need', 'for', 'with', 'of', 'and', 'help', 'how', 'can', 'you', 'do', 'some', 'is', 'in', 'on', 'it']);

/** The options that fit what somebody typed, best first. */
export function matchFeatures(features: readonly AiFeature[], query: string): AiFeature[] {
  const words = query.toLowerCase().match(/[a-z0-9+#]+/g)?.filter(w => !SKIP.has(w)) ?? [];
  if (!words.length) return [];
  return features
    .map(f => {
      const title = f.title.toLowerCase(), rest = f.text.toLowerCase(), hint = HINTS[f.title] ?? '';
      const at = (hay: string, w: string) => new RegExp(`\\b${w.replace(/[+#]/g, '\\$&')}`).test(hay);
      // what people mean counts most, then the name, then the description
      const worth = (w: string) => (at(hint, w) ? 4 : 0) + (at(title, w) ? 3 : 0) + (at(rest, w) ? 1 : 0);
      const hits = words.filter(w => worth(w) > 0);
      return { f, score: hits.reduce((n, w) => n + worth(w), 0) + (hits.length === words.length ? 2 : 0) };
    })
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 8).map(x => x.f);
}
