import { SectionId } from './assistant.bus';
import type { LabId } from '../lab/lab-ids';
import { evidence, fold, plainWords } from './evidence';
import { PageCmd, pageCommand } from './page-commands';
import { smallTalk } from './small-talk';
import { WinCmd, windowCommand } from './window-commands';
import { ABOUT_HIGHLIGHTS, EDUCATION, EXPERIENCE, PROFILE, PROJECTS, SKILL_CATEGORIES } from '../data/portfolio.data';
import { STUDY_GUIDES } from '../data/study.data';

/** Everything ALPHA says is generated from the portfolio data, so it never drifts from the site. */

const [kaaspro, intern] = EXPERIENCE;
const be = EDUCATION[EDUCATION.length - 1];
const SKILLS = SKILL_CATEGORIES.flatMap(c => c.skills.map(s => ({ name: s.name, cat: c.name })));
const TOPICS = STUDY_GUIDES.flatMap(g => g.topics.map(t => ({ ...t, file: g.file, guide: g.short })));
const QUESTIONS = TOPICS.reduce((n, t) => n + t.questions, 0);
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** "Explain this section" — what ALPHA says about each part of the page. */
export const NARRATION: Record<SectionId, string> = {
  home: `This is ${PROFILE.name}, a ${PROFILE.role} from ${PROFILE.location.split(',')[0]} with more than three years of experience. He builds secure, scalable enterprise web applications with Spring Boot, Angular and Hibernate, and he currently works at ${PROFILE.company} on the 75Health cloud EHR and EMR platforms.`,
  about: `A little about Kishore. His strengths are ${list(ABOUT_HIGHLIGHTS.map(h => h.title.toLowerCase()))}. He has shipped ${PROJECTS.length} projects and works with ${SKILLS.length} technologies.`,
  skills: `Kishore's toolbox has ${SKILLS.length} technologies in ${SKILL_CATEGORIES.length} groups. ${SKILL_CATEGORIES.slice(0, 4).map(c => `${c.name}: ${list(c.skills.slice(0, 4).map(s => s.name))}`).join('. ')}. He also uses AI assistants like Claude, Copilot and Gemini every day.`,
  projects: `There are ${PROJECTS.length} projects here. The headline one is the 75Health EHR, a cloud based electronic health record platform for clinics and hospitals, built with Java 21, Spring Boot, Spring Security, Hibernate and Angular. The 75Health EMR is a multi-tenant SaaS on OpenEMR, which Kishore upgraded to PHP 8.4 using AI tools.`,
  experience: `Since ${kaaspro.period.split(' –')[0]}, Kishore has been a ${kaaspro.role} at ${kaaspro.company}, working with Java 21, Spring Boot, Angular and MySQL. Before that, he spent ${intern.duration} as a ${intern.role} at ${intern.company}, where he built ${list(intern.projects)}.`,
  education: `Kishore holds a ${be.degree} from ${be.institution.split(',')[0]}, finished in ${be.year}. Before that he completed his HSC and SSLC at ${EDUCATION[0].institution.split(',')[0]}.`,
  prep: `These are the notes Kishore revises before interviews: ${TOPICS.length} chapters and over ${QUESTIONS.toLocaleString()} questions, split into a Java full stack guide and a DSA and coding guide. Search any topic and each chapter opens straight to its page.`,
  ai: `The AI Lab holds every AI option on Kishore O S. There is an AI twin, a job matcher, a resume analyzer, coding and diagram tools, a mock interview, and more. They run in your browser with free AI, and most have a version that needs no AI at all.`,
  contact: `Want to work with Kishore? Email him at ${PROFILE.email.replace('@', ' at ')}, or use the contact form. He is open to Java full stack roles and freelance projects.`,
};

export interface TourStep { app: SectionId; text: string; project?: string; }

/** The guided tour — ALPHA opens each window and narrates it. */
export const TOUR: TourStep[] = [
  { app: 'home', text: `Hi, I'm Alpha, I'm here to assist you. Welcome to Kishore O S, his portfolio built as a tiny operating system. I'll take you through it. You can pause, skip, or stop me at any time. ${NARRATION.home}` },
  { app: 'skills', text: NARRATION.skills },
  { app: 'projects', text: NARRATION.projects },
  { app: 'experience', text: NARRATION.experience },
  { app: 'education', text: NARRATION.education },
  { app: 'prep', text: NARRATION.prep },
  { app: 'ai', text: NARRATION.ai },
  { app: 'contact', text: `${NARRATION.contact} That's the tour! You can also tile windows, ask in the Terminal, or press Control K to search everything. Tap me any time, or just say Alpha.` },
];

export interface Reply { text: string; open?: SectionId; /** bring this project to the front */ project?: string; /** a button under the answer */ url?: string; label?: string; page?: PageCmd; win?: WinCmd; live?: boolean; link?: string; copy?: string; tour?: boolean; match?: boolean; interview?: boolean; draft?: boolean; github?: boolean; forget?: boolean; lab?: LabId; /** small talk: fixed English text, so another language goes to the AI when it can */ chat?: boolean; }

const has = (q: string, ...w: string[]) => w.some(x => q.includes(x));

const SECTION_WORDS: [string[], SectionId][] = [[['home', 'top', 'start'], 'home'], [['about', 'profile', 'bio'], 'about'], [['project', 'work', 'portfolio'], 'projects'],
  [['experience', 'job', 'career'], 'experience'], [['education', 'degree', 'college'], 'education'], [['skill', 'stack', 'tech'], 'skills'],
  [['note', 'study', 'prep'], 'prep'], [['ai'], 'ai'], [['contact', 'email', 'mail'], 'contact']];

const SITE_STORY = 'Kishore O S is Angular 22 with signals and no Zone.js, a three.js shader for the wallpaper, the View Transitions API for the windows, and the Web Speech API for my voice. No server needed.';
const MATCH: Reply = { text: "Sure. Paste the job description and I'll check it against Kishore's skills, projects and jobs.", match: true };
const INTERVIEW: Reply = { text: "Let's do a mock interview. Pick a topic and I'll ask five questions from the study notes.", interview: true };
const DRAFT: Reply = { text: "Tell me the gist in the contact form and I'll draft it. Nothing is sent until you press Send.", draft: true };
const GITHUB: Reply = { text: 'Let me check GitHub.', github: true };
const FORGET: Reply = { text: "Done. I've forgotten what I remembered about you on this device.", forget: true };
const FREE_QUESTIONS = new Set(['who is kishore', 'tell me about the 75health emr', 'jwt notes', 'how do i contact him', 'how was this site built']);

/**
 * Whole-message commands that need no AI ("start the tour", "show his projects", "hi").
 * They stay instant and don't use up the free Gemini quota. Anything more specific returns null.
 */
export function quickReply(raw: string): Reply | null {
  const q = raw.toLowerCase().replace(/[?!.,]/g, '').replace(/\s+/g, ' ').trim();
  if (/^(please )?((start|begin|play|take) )?((the|a) )?(guided )?tour$|^show me around$/.test(q)) return { text: 'Starting the guided tour now.', tour: true };
  const win = windowCommand(raw);
  if (win) return { text: win.text, win: win.cmd };
  const page = pageCommand(raw);
  if (page) return { text: page.text, page: page.cmd };
  if (/^(start |open )?(live talk|live chat|live mode|live conversation|conversation mode|talk (to|with) me|let's talk|lets talk)$/.test(q)) return { text: 'Live talk is on. Just speak, and say “stop” when you are done.', live: true };
  const chat = smallTalk(raw);
  if (chat) return { text: chat, chat: true };
  const nav = q.match(/^(?:open|show|show me|go to|scroll to|take me to) (?:the |his )?(\w+)(?: section)?$/);
  const hit = nav && SECTION_WORDS.find(([ws]) => ws.some(w => nav[1].startsWith(w)));
  if (hit) return { text: NARRATION[hit[1]], open: hit[1] };
  if (/^(match|check|compare|paste) (a |my |this |the |your )?(job|jd|job description|role|vacancy)( description)?$|^is (he|kishore) a (good )?(fit|match)( for (my|this|a|the|our) (job|role))?$/.test(q)) return MATCH;
  if (/^((start|begin|take|do|try) )?(a |the )?mock interview( me)?$|^(interview|quiz) me$/.test(q)) return INTERVIEW;
  if (/^(draft|write) (me )?(a |an )?(message|email|note)( to (him|kishore))?$/.test(q)) return DRAFT;
  if (/^what('s|s| is) (he|kishore) (working on|building|coding)( now| these days| lately| currently| right now)?$|^(show )?(his )?github( activity)?$/.test(q)) return GITHUB;
  if (/^(what|which|list|show)( are)?( all)?( the| your)? (ai|a i) (features|options|tools)( are (there|available))?( here| on this site)?$|^ai lab$/.test(q)) return { text: NARRATION.ai, open: 'ai' };
  if (/^(book|plan|schedule|arrange|set up) (a )?(meeting|call)( with (him|kishore))?$/.test(q)) return { text: 'Tell me when, and I will make a calendar file and a draft message. Nothing is booked until you confirm.', lab: 'meeting' };
  if (/^forget (me|about me|everything)$/.test(q)) return FORGET;
  // the suggestion buttons: the same question from everyone, so the shared quota isn't spent on them
  if (FREE_QUESTIONS.has(q)) return answer(raw);
  return null;
}

/** May a study note answer this? Only technical questions that aren't about Kishore, the site or ALPHA. */
export function noteAllowed(question: string, fixed: Reply): boolean {
  if (fixed.chat || fixed.win || fixed.lab || fixed.tour || fixed.match || fixed.interview || fixed.draft || fixed.github || fixed.forget || fixed.link) return false;
  if (/\b(kishore|he|his|him|your|yours|yourself|alpha|are you|you are|site|website|portfolio|projects?|skills?|experience|education|contact|resume|tour|job)\b/i.test(question)) return false;
  return fixed.text.startsWith('I only know') || /^(what|how|why|when|explain|define|compare|difference|is|are|does|can)\b/i.test(question);
}

/** Small intent matcher over the data — no network, no AI service. */
export function answer(raw: string): Reply {
  const q = ' ' + raw.toLowerCase().replace(/[?!.]/g, '') + ' ';

  const chat = smallTalk(raw);
  if (chat) return { text: chat, chat: true };

  // text selected on the page: say what is known about it, but don't open or move anything
  const picked = raw.match(/^Explain this from the page: "([\s\S]*)"$/)?.[1];
  if (picked !== undefined) {
    const named = SKILLS.filter(s => s.name.length > 2 && ` ${picked.toLowerCase().replace(/[^a-z0-9+#]+/g, ' ')} `.includes(` ${s.name.toLowerCase()} `)).slice(0, 3);
    return { text: named.length ? `That mentions ${list(named.map(s => s.name))}. ${named.map(s => { const used = evidence(s.name).projects; return used.length ? `Kishore used ${s.name} on ${list(used.slice(0, 2))}.` : `${s.name} is in his skills list.`; }).join(' ')}` : "I can't explain that without AI, and it is resting right now. Please try again later." };
  }

  if (has(q, 'tour', 'show me around', 'guide me')) return { text: 'Starting the guided tour now.', tour: true };
  const openMatch = q.match(/\b(open|show|go to|scroll to|take me to)\s+(the\s+|his\s+)?(\w+)/);
  if (openMatch) {
    const hit = SECTION_WORDS.find(([ws]) => ws.some(w => openMatch[3].startsWith(w)));
    if (hit) return { text: `Here is ${hit[1]}.`, open: hit[1] };
  }

  if (has(q, 'job description', ' jd ')) return MATCH;
  if (has(q, 'mock interview', 'interview me', 'quiz me')) return INTERVIEW;
  if (has(q, 'draft', 'write a message', 'write an email', 'write to kishore', 'write to him')) return DRAFT;
  if (has(q, ' github ', 'working on', 'repositor')) return GITHUB;
  if (has(q, 'this site', 'this portfolio', 'this website') && has(q, 'how', 'built', 'made')) return { text: SITE_STORY };
  if (has(q, 'contact', 'email', 'phone', 'reach', 'hire', 'available')) {
    return { text: `You can email Kishore at ${PROFILE.email} or call ${PROFILE.phone}. He's open to Java full stack roles and freelance work. I've copied the email for you.`, open: 'contact', copy: PROFILE.email };
  }
  if (has(q, 'resume', ' cv ')) return { text: 'Opening his resume.', win: { do: 'open', app: 'resume' } };

  const aboutHim = /\b(he|his|him|kishore|know|knows|used|uses|worked)\b/.test(q);
  const wantsNotes = has(q, 'note', 'prep', 'interview', 'question', 'revise', 'study', 'chapter', 'explain');
  const named = SKILLS.some(s => s.name.length > 2 && q.includes(' ' + s.name.toLowerCase() + ' '));
  const topic = TOPICS.find(t => (q.includes(' ' + t.title.toLowerCase() + ' ') && !aboutHim && (wantsNotes || !named)) || (has(q, 'note', 'prep', 'interview', 'question', 'revise', 'study') && t.title.toLowerCase().split(/[\s&/:,()]+/).filter(w => w.length > 3).some(w => q.includes(' ' + w))));
  if (topic) return { text: `${topic.title} is a chapter in the ${topic.guide} guide, with ${topic.questions} questions. Opening it in a new tab.`, link: `${topic.file}#${topic.id}` };

  // full title first, then keywords — EMR before EHR because both titles start with "75Health"
  const byTitle = (t: string) => PROJECTS.find(p => p.title === t);
  const proj = PROJECTS.find(p => q.includes(p.title.toLowerCase())) ??
    (has(q, ' emr', 'openemr') ? byTitle('75Health EMR') : has(q, ' ehr') ? byTitle('75Health EHR') : has(q, 'kaaspro website') ? byTitle('Kaaspro Website') :
     has(q, 'crm', 'mysales') ? PROJECTS.find(p => p.title.startsWith('MySales')) : has(q, 'exam', 'mycognitiv') ? PROJECTS.find(p => p.title.startsWith('MyCognitiv')) : undefined);
  if (proj) return { text: projectStory(proj.title), open: 'projects', project: proj.title };

  // whole words, longest first: "javascript" is not Java, "spring boot" is not Spring
  const words = ` ${fold(plainWords(q))} `;
  const skill = [...SKILLS].sort((a, b) => b.name.length - a.name.length).find(s => s.name.length > 2 && words.includes(` ${fold(plainWords(s.name))} `));
  if (skill) {
    const used = evidence(skill.name).projects; // whole words, so Java is not JavaScript
    return { text: `Yes, ${skill.name} is in Kishore's toolbox, under ${skill.cat}.${used.length ? ` He used it on ${list(used)}.` : ''}`, open: 'skills' };
  }
  if (has(q, 'project', 'built', 'product')) return { text: NARRATION.projects, open: 'projects' };
  if (has(q, 'intern', 'techietact')) return { text: `${intern.role} at ${intern.company}, for ${intern.duration}. ${intern.summary}`, open: 'experience' };
  if (has(q, 'experience', 'years', 'job', 'work', 'company', 'kaaspro', 'current')) return { text: NARRATION.experience, open: 'experience' };
  if (has(q, 'study', 'education', 'degree', 'college', 'school')) return { text: NARRATION.education, open: 'education' };
  if (has(q, 'skill', 'tech', 'stack', 'know', 'language')) return { text: NARRATION.skills, open: 'skills' };
  if (has(q, 'note', 'prep', 'interview')) return { text: NARRATION.prep, open: 'prep' };
  if (has(q, 'where', 'location', 'live', 'based', 'city')) return { text: `Kishore is based in ${PROFILE.location}.` };
  if (/\b(built|made|created|coded|developed)\b/.test(q) && /\b(this|it|site|website|portfolio)\b/.test(q)) return { text: SITE_STORY };
  if (has(q, 'who', 'about', 'what does', 'tell me', 'introduce') && /\b(kishore|he|him|his|himself|developer|owner|portfolio|candidate)\b/.test(q) || /^ (about|profile|bio) $/.test(q)) return { text: NARRATION.home, open: 'about' };
  if (has(q, ' hi ', 'hello', ' hey ', 'vanakkam')) return { text: `Hello! Ask me about Kishore's projects, skills, experience or interview notes. Or say "start the tour".` };
  if (has(q, 'thank')) return { text: "You're welcome! Anything else?" };
  return { text: `I only know what's on this site, and I didn't catch that. Try "what are his skills", "tell me about the 75Health EMR", "Kafka notes", or "start the tour".` };
}

/** A spoken summary of one project. */
export function projectStory(title: string): string {
  const p = PROJECTS.find(x => x.title === title)!;
  return `${p.title}, at ${p.org}, ${p.period.replace('–', 'to')}. ${p.features.slice(0, 3).join('. ')}. It's built with ${list(p.tech.slice(0, 5))}.`;
}
