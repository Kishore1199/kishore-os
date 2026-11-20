import { AppId } from './os.service';
import { ABOUT_HIGHLIGHTS, EDUCATION, EXPERIENCE, PROFILE, PROJECTS, SKILL_CATEGORIES } from '../data/portfolio.data';
import { STUDY_GUIDES } from '../data/study.data';

/** Everything Alpha says is generated from the portfolio data, so it never drifts from the site. */

const [kaaspro, intern] = EXPERIENCE;
const be = EDUCATION[EDUCATION.length - 1];
const SKILLS = SKILL_CATEGORIES.flatMap(c => c.skills.map(s => ({ name: s.name, cat: c.name })));
const TOPICS = STUDY_GUIDES.flatMap(g => g.topics.map(t => ({ ...t, file: g.file, guide: g.short })));
const QUESTIONS = TOPICS.reduce((n, t) => n + t.questions, 0);
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** "Explain this window" — what Alpha says about each app. */
export const NARRATION: Record<AppId, string> = {
  about: `This is ${PROFILE.name}, a ${PROFILE.role} from ${PROFILE.location.split(',')[0]} with more than three years of experience. He builds secure, scalable enterprise web applications with Spring Boot, Angular and Hibernate, and he currently works at ${PROFILE.company} on the 75Health cloud EHR and EMR platforms. His strengths: ${list(ABOUT_HIGHLIGHTS.map(h => h.title.toLowerCase()))}.`,
  experience: `Experience, newest first. Since ${kaaspro.period.split(' –')[0]}, Kishore has been a ${kaaspro.role} at ${kaaspro.company}, working with Java 21, Spring Boot, Angular and MySQL, and upgrading the PHP based 75Health EMR with AI tools. Before that, he spent ${intern.duration} as a ${intern.role} at ${intern.company}, where he built ${list(intern.projects)}. He holds a ${be.degree} from ${be.institution.split(',')[0]}.`,
  projects: `There are ${PROJECTS.length} projects here. The headline one is the 75Health EHR, a cloud based electronic health record platform used by clinics and hospitals, built with Java 21, Spring Boot, Spring Security, Hibernate and Angular. The 75Health EMR is a multi-tenant SaaS on OpenEMR, which Kishore upgraded to PHP 8.4 using AI tools. Pick any project on the left and press the speaker button, and I will explain that one.`,
  skills: `Kishore's toolbox has ${SKILLS.length} technologies in ${SKILL_CATEGORIES.length} groups. ${SKILL_CATEGORIES.slice(0, 4).map(c => `${c.name}: ${list(c.skills.slice(0, 4).map(s => s.name))}`).join('. ')}. He also uses AI assistants like Claude, Copilot and Gemini every day.`,
  notes: `These are the notes Kishore revises before interviews: ${TOPICS.length} chapters and over ${QUESTIONS.toLocaleString()} questions, split into a Java full stack guide and a DSA and coding guide. Search for any topic, like JWT or Kafka, and each chapter opens straight to its page.`,
  terminal: `This is a working terminal. Type help to see the commands. You can list projects, open any app, switch the theme, or even type say, followed by some text, and I will read it out loud.`,
  contact: `Want to work with Kishore? Email him at ${PROFILE.email.replace('@', ' at ')}, or use the form on the right and the message lands straight in his inbox. He is open to Java full stack roles and freelance projects.`,
  games: `The arcade has two quick games. Bug Squash: fix as many production bugs as you can in twenty seconds. Stack Match: a memory game with the logos from Kishore's tech stack.`,
  monitor: `The system monitor shows how this site itself is built, with live frame rate and load time, plus a simplified map of the 75Health EHR architecture. Click any block to learn what it does.`,
  guestbook: `This is the guestbook. Leave a short note for Kishore, pick a sticky-note colour, and it appears on the wall for every visitor in real time.`,
  resume: `This is Kishore's resume as a PDF. You can read it here or download it with the button at the top.`,
};

export interface TourStep { app: AppId | null; text: string; }

/** The guided tour — Alpha opens each app and narrates it. */
export const TOUR: TourStep[] = [
  { app: null, text: `Hi, I'm Alpha, I'm here to assist you. Welcome to Kishore O S, his portfolio built as a tiny operating system. I'll take you on a quick tour. You can pause, skip, or stop me at any time.` },
  { app: 'about', text: NARRATION.about },
  { app: 'experience', text: NARRATION.experience },
  { app: 'projects', text: NARRATION.projects },
  { app: 'skills', text: NARRATION.skills },
  { app: 'notes', text: NARRATION.notes },
  { app: 'terminal', text: `For the curious, there's a real terminal. Try commands like help, ls projects, or just type alpha. And anywhere on the desktop, press Control K to search everything.` },
  { app: 'contact', text: `${NARRATION.contact} That's the tour! Tap my orb whenever you have a question, you can even ask out loud with the microphone.` },
];

export interface Reply { text: string; open?: AppId; link?: string; copy?: string; tour?: boolean; }

const has = (q: string, ...w: string[]) => w.some(x => q.includes(x));

/** Small intent matcher over the data — no network, no AI service. */
export function answer(raw: string): Reply {
  const q = ' ' + raw.toLowerCase().replace(/[?!.]/g, '') + ' ';

  if (has(q, 'tour', 'show me around', 'guide me')) return { text: 'Starting the guided tour now.', tour: true };
  const openMatch = q.match(/\b(open|show|launch|go to)\s+(the\s+)?(\w+)/);
  const appWords: [string[], AppId][] = [[['about', 'profile', 'bio'], 'about'], [['project', 'work', 'portfolio'], 'projects'], [['experience', 'job', 'career'], 'experience'],
    [['skill', 'stack', 'tech'], 'skills'], [['note', 'study', 'prep'], 'notes'], [['terminal', 'shell', 'console'], 'terminal'], [['contact', 'email', 'mail'], 'contact'],
    [['game', 'arcade'], 'games'], [['guest', 'wall'], 'guestbook'], [['monitor', 'system', 'architecture'], 'monitor'], [['resume', 'cv'], 'resume']];
  if (openMatch) {
    const hit = appWords.find(([ws]) => ws.some(w => openMatch[3].startsWith(w)));
    if (hit) return { text: `Opening ${hit[1] === 'about' ? 'About Me' : hit[1]}.`, open: hit[1] };
  }

  if (has(q, 'contact', 'email', 'phone', 'reach', 'hire', 'available')) {
    return { text: `You can email Kishore at ${PROFILE.email} or call ${PROFILE.phone}. He's open to Java full stack roles and freelance work. I've copied the email for you.`, open: 'contact', copy: PROFILE.email };
  }
  if (has(q, 'resume', ' cv ')) return { text: 'Here is his resume.', open: 'resume' };

  const topic = TOPICS.find(t => q.includes(' ' + t.title.toLowerCase() + ' ') || (has(q, 'note', 'prep', 'interview', 'question', 'revise', 'study') && t.title.toLowerCase().split(/[\s&/:,()]+/).filter(w => w.length > 3).some(w => q.includes(' ' + w))));
  if (topic) return { text: `${topic.title} is a chapter in the ${topic.guide} guide, with ${topic.questions} questions. Opening it in a new tab.`, link: `${topic.file}#${topic.id}` };

  const byTitle = (t: string) => PROJECTS.find(p => p.title === t);
  const proj = PROJECTS.find(p => q.includes(p.title.toLowerCase())) ??
    (has(q, ' emr', 'openemr') ? byTitle('75Health EMR') : has(q, ' ehr') ? byTitle('75Health EHR') : has(q, 'kaaspro website') ? byTitle('Kaaspro Website') :
     has(q, 'crm', 'mysales') ? PROJECTS.find(p => p.title.startsWith('MySales')) : has(q, 'exam', 'mycognitiv') ? PROJECTS.find(p => p.title.startsWith('MyCognitiv')) : undefined);
  if (proj) return { text: projectStory(proj.title), open: 'projects' };

  const skill = SKILLS.find(s => s.name.length > 2 && q.includes(' ' + s.name.toLowerCase()));
  if (skill) {
    const used = PROJECTS.filter(p => p.tech.some(t => t.toLowerCase().startsWith(skill.name.toLowerCase()))).map(p => p.title);
    return { text: `Yes, ${skill.name} is in Kishore's toolbox, under ${skill.cat}.${used.length ? ` He used it on ${list(used)}.` : ''}`, open: 'skills' };
  }
  if (has(q, 'project', 'built', 'product')) return { text: NARRATION.projects, open: 'projects' };
  if (has(q, 'intern', 'techietact')) return { text: `${intern.role} at ${intern.company}, for ${intern.duration}. ${intern.summary}`, open: 'experience' };
  if (has(q, 'experience', 'years', 'job', 'work', 'company', 'kaaspro', 'current')) return { text: NARRATION.experience, open: 'experience' };
  if (has(q, 'study', 'education', 'degree', 'college', 'school')) return { text: `He studied ${be.degree} at ${be.institution}, from ${be.period}. Before that, HSC and SSLC at ${EDUCATION[0].institution.split(',')[0]}.`, open: 'experience' };
  if (has(q, 'skill', 'tech', 'stack', 'know', 'language')) return { text: NARRATION.skills, open: 'skills' };
  if (has(q, 'note', 'prep', 'interview')) return { text: NARRATION.notes, open: 'notes' };
  if (has(q, 'where', 'location', 'live', 'based', 'city')) return { text: `Kishore is based in ${PROFILE.location}.` };
  if (has(q, 'game', 'play', 'bored')) return { text: NARRATION.games, open: 'games' };
  if (has(q, 'how', 'built', 'made')) return { text: 'This site is Angular 22 with signals and no Zone.js, a three.js shader for the wallpaper, the View Transitions API for windows, and the Web Speech API for my voice. No server needed.', open: 'monitor' };
  if (has(q, 'who', 'about', 'what does', 'tell me', 'introduce', 'yourself')) return { text: NARRATION.about, open: 'about' };
  if (has(q, ' hi ', 'hello', ' hey ', 'vanakkam')) return { text: `Hello! Ask me about Kishore's projects, skills, experience or interview notes. Or say "start the tour".` };
  if (has(q, 'thank')) return { text: "You're welcome! Anything else?" };
  return { text: `I only know what's on this site, and I didn't catch that. Try "what are his skills", "tell me about the 75Health EMR", "Kafka notes", or "start the tour".` };
}

/** A spoken summary of one project. */
export function projectStory(title: string): string {
  const p = PROJECTS.find(x => x.title === title)!;
  return `${p.title}, at ${p.org}, ${p.period.replace('–', 'to')}. ${p.features.slice(0, 3).join('. ')}. It's built with ${list(p.tech.slice(0, 5))}.`;
}
