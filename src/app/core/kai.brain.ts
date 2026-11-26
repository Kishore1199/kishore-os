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
  monitor: `The system monitor shows how this site itself is built, with live frame rate and load time, what my agent is doing, and a simplified map of the 75Health EHR architecture. Click any block to learn what it does.`,
  ailab: `This is the AI Lab. It holds every AI option on Kishore O S: the job matcher, coding and diagram tools, games, and more. Each tool opens in its own window.`,
  wallpaper: `Choose your own desktop background here. Upload a picture, or pick one of the ready made ones. Your picture stays in this browser and is never uploaded.`,
  files: `These are your files. Results you save from the AI Lab appear here, next to Kishore's resume and study guides. They stay in this browser.`,
  guestbook: `This is the guestbook. Leave a short note for Kishore, pick a sticky-note colour, and it appears on the wall for every visitor in real time.`,
  resume: `This is Kishore's resume as a PDF. You can read it here or download it with the button at the top.`,
  card: `This is Kishore's digital business card. Flip it to see a QR code: scan it with your phone camera and his phone, email, LinkedIn and GitHub are saved to your contacts. You can also download the contact file or share the card.`,
  play: `This is the AI Playground, home of every game. In the AI games I plan a mission on this desktop, narrate an on-call adventure, or read your mind. There are also nine quick games: Bug Squash, Stack Match, Coffee Catch, Three in a Row, Quick Tap, Rock Paper Scissors, Skill Detective, a code typing race, and a studio where you direct me.`,
};

export { answer, projectStory } from './assistant.brain';
