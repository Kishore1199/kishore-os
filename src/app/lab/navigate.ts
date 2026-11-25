import { SECTIONS, SectionId } from '../core/assistant.bus';
import { PROJECTS } from '../data/portfolio.data';
import { fold, plainWords } from '../core/evidence';

export interface NavStep { label: string; section: SectionId; project?: string; }
const WORDS: Record<string, SectionId> = { home: 'home', top: 'home', about: 'about', profile: 'about', skill: 'skills', technologi: 'skills', project: 'projects', work: 'projects', experience: 'experience', job: 'experience', career: 'experience', education: 'education', degree: 'education', note: 'prep', prep: 'prep', study: 'prep', ai: 'ai', contact: 'contact', email: 'contact', message: 'contact' };

/** "Show the EMR project, then my skills, then contact" → steps. */
export function planRoute(command: string): NavStep[] {
  const steps: NavStep[] = [];
  for (const part of command.split(/\bthen\b|\band\b|,|;|->|→/i)) {
    const hay = ` ${fold(plainWords(part))} `;
    // the most specific project: full title first, then its distinctive words
    const p = PROJECTS.find(x => hay.includes(` ${fold(plainWords(x.title))} `))
      ?? PROJECTS.find(x => fold(plainWords(x.title)).split(' ').some(w => w.length > 2 && !['75health', 'website', 'online', 'kaaspro'].includes(w) && hay.includes(` ${w} `)));
    const word = Object.keys(WORDS).find(w => hay.split(' ').some(h => h === w || (w.length > 3 && h.startsWith(w))));
    const step: NavStep | null = p ? { label: p.title, section: 'projects', project: p.title } : word ? { label: WORDS[word], section: WORDS[word] } : null;
    if (step && SECTIONS.includes(step.section)) steps.push(step);
  }
  return steps.slice(0, 6);
}
