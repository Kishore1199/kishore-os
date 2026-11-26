import { ABOUT_HIGHLIGHTS, EDUCATION, EXPERIENCE, PROFILE, PROJECTS, SKILL_CATEGORIES } from '../data/portfolio.data';
import { STUDY_GUIDES } from '../data/study.data';

/** Everything the AI is allowed to know about Kishore. `compact` drops the chapter list, for small on-device models. */
export function portfolioFacts(compact = false): string {
  const exp = EXPERIENCE.map(e => `- ${e.role} at ${e.company} (${e.period}, ${e.duration}). ${e.summary} Projects: ${e.projects.join(', ')}. Tech: ${e.tech.join(', ')}.`).join('\n');
  const proj = PROJECTS.map(p => `- ${p.title} (${p.org}, ${p.period}${p.link ? ', ' + p.link : ''}): ${p.features.join('; ')}. Tech: ${p.tech.join(', ')}.`).join('\n');
  const skills = SKILL_CATEGORIES.map(c => `- ${c.name}: ${c.skills.map(s => s.name).join(', ')}`).join('\n');
  const edu = EDUCATION.map(e => `- ${e.degree}, ${e.institution} (${e.period}), ${e.grade}`).join('\n');
  const notes = STUDY_GUIDES.map(g => `- ${g.title}: ${g.topics.map(t => t.title).join(', ')}`).join('\n');
  return `PROFILE: ${PROFILE.name}, ${PROFILE.role}, ${PROFILE.location}. 3+ years of experience. Email ${PROFILE.email}, phone ${PROFILE.phone}, LinkedIn ${PROFILE.linkedin}, GitHub ${PROFILE.github}. Open to Java full-stack roles and freelance work.
STRENGTHS: ${ABOUT_HIGHLIGHTS.map(h => `${h.title} — ${h.desc}`).join(' | ')}
EXPERIENCE:
${exp}
PROJECTS:
${proj}
SKILLS:
${skills}
EDUCATION:
${edu}${compact ? '' : `
INTERVIEW-PREP NOTES ON THIS SITE (chapter titles):
${notes}`}
THIS SITE: Kishore.OS — Kishore's portfolio as a small desktop operating system, built with Angular 22 and three.js. Its apps open in windows: About Me, Projects, Experience (with education), Skills, Study Notes, Terminal, Contact, AI Lab, Files, Wallpaper, Guestbook, AI Playground (all the games. AI games — Mission Control: ALPHA plans and runs a fun mission on the desktop; On-call adventure: a choose-your-path incident story; Mind reader: ALPHA guesses a skill with yes or no questions. Quick games — Bug squash, Stack match, Coffee catch, Three in a row, Quick tap, Rock paper scissors, Skill detective, Typing race, Robot studio), Business Card (a flip card with a QR code that saves Kishore's contact to a phone, plus a .vcf download), System Monitor and Resume. It has a dock, Spotlight search (Ctrl K), a menu bar, and ALPHA the voice guide.`;
}
