import { EXPERIENCE, PROJECTS, RESPONSIBILITIES, SKILL_CATEGORIES } from '../data/portfolio.data';
import type { Reply } from './assistant.brain';
import { evidence, fold, plainWords } from './evidence';
import { pageCommand } from './page-commands';
import { smallTalk } from './small-talk';

/** What the conversation is about right now. */
type Topic = { kind: 'project'; id: string } | { kind: 'skill'; id: string } | { kind: 'job'; id: number };
/** What could come next: a question for the visitor, and buttons that answer it. */
export interface Next { ask: string; chips: string[]; }
export interface Follow { /** go on as if the visitor had asked this */ ask?: string; reply?: Reply; }

const list = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const SKILLS = SKILL_CATEGORIES.flatMap(c => c.skills.map(s => s.name));
const KNOWN = [...SKILLS].map(n => [fold(plainWords(n)), n] as const).sort((a, b) => b[0].length - a[0].length);
const ALIAS: [RegExp, string][] = [[/\b(open)?emr\b/, '75Health EMR'], [/\behr\b/, '75Health EHR'], [/\b(crm|my ?sales)\b/, 'MySales – CRM'], [/\b(exams?|my ?cognitiv)\b/, 'MyCognitiv – Online Exams']];

const YES = /^(yes|yeah|yep|yup|ya|sure|ok|okay|please|go on|go ahead|of course|why not|yes please|do it|i do|definitely)$/;
const NO = /^(no|nope|nah|no thanks|not now|no thank you|skip)$/;
const MORE = /^(tell me more|more|more details|more info|go on|continue|what else|anything else|and then|keep going|explain more|details|really|is it)$/;

/** Keeps the thread of a conversation: follow-ups, offers, the visitor's name. In memory only; no AI. */
export class Dialogue {
  private topic: Topic | null = null;
  private offer = '';
  private told = new Map<string, number>();
  private last = '';
  /** the last answer stayed on the topic */
  private keep = false;
  private askedWho = false;
  private askedName = false;
  private asks = new Set<string>();
  /** given by the visitor, kept for this page only */
  name = '';

  reset() {
    this.topic = null; this.offer = ''; this.last = ''; this.name = ''; this.askedWho = this.askedName = false;
    this.told.clear(); this.asks.clear();
  }

  /** What the visitor means, given what was said before. `ai`: Gemini will handle open follow-ups better. */
  follow(raw: string, ai: boolean): Follow | null {
    const q = raw.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9+#.' ]+/g, ' ').replace(/[.]+$/, '').replace(/\s+/g, ' ').trim().replace(/^(ok |okay |so |and |well )(?=\w+ )/, '').replace(/ (alpha|please)$/, '');
    const offer = this.offer;
    if (offer && YES.test(q)) { this.offer = ''; return { ask: offer }; }
    if (offer && NO.test(q)) { this.offer = ''; return { reply: { text: "No problem. What would you like to know instead?", chat: true } }; }

    const named = q.match(/^(?:my name is|call me|you can call me|my name's) ([a-z]{2,20})(?: [a-z]{1,20})?$/) ?? (this.askedName ? q.match(/^(?:i am|i'm|this is|it's|it is)? ?([a-z]{2,20})$/) : null);
    if (named && !smallTalk(named[1]) && !pageCommand(named[1]) && !/^(next|more|why|again|repeat|continue|another|other|java|about|show|sure|maybe|later|stop|start|open|close|who|what|when|yes|no|fine|good|ok|okay|here|hiring|learning|exploring|looking|busy|not|nothing|nobody|skip|hello|hi|projects?|skills?|tour|experience|contact|resume|help|java|docker|angular|alpha)$/.test(named[1]) && !KNOWN.some(([k]) => k === named[1])) {
      this.name = named[1].charAt(0).toUpperCase() + named[1].slice(1);
      this.askedName = false;
      return { reply: { text: `Nice to meet you, ${this.name}! Are you hiring, learning, or just exploring?`, chat: true } };
    }
    this.askedName = false;
    if (/^(what('s| is) my name|who am i|do you (know|remember) (my name|me))$/.test(q)) return { reply: { text: this.name ? `You're ${this.name}, of course!` : "You haven't told me yet. What should I call you?", chat: true } };
    if (/^(repeat( that)?|say (that|it) again|again|come again|what did you say|pardon|sorry what)$/.test(q) && this.last) return { reply: { text: this.last, chat: true } };

    if (/^(i am |i'm |we are |we're )?(hiring|a recruiter|recruiting|looking for a developer)$/.test(q)) return { reply: { text: 'Great! I can check your job description against Kishore’s real projects, gaps included. Shall I open the job matcher?', chat: true } };
    if (/^(i am |i'm )?(learning|a student|studying|preparing( for an? interviews?)?)$/.test(q)) return { reply: { text: 'Nice! I have over 2,700 interview questions here. Shall I start a mock interview?', chat: true } };
    if (/^(i am |i'm )?(just )?(exploring|looking( around)?|browsing|curious|visiting)$/.test(q)) return { reply: { text: 'Welcome aboard! Shall I give you a guided tour?', chat: true } };

    if (/^(i am |i'm )(a |an )?(\w+ )?(developer|engineer|programmer|coder|tester)$/.test(q)) return { reply: { text: 'Nice to meet a fellow builder! I can show you how this site works, or quiz you on Java. Shall I start a mock interview?', chat: true } };
    if (/^(i am |i'm )(a |an )?(client|business owner|founder|startup founder|customer)$/.test(q)) return { reply: { text: 'Welcome! Kishore takes freelance work too. Shall I help you write to him?', chat: true } };
    const about = q.match(/^(?:what about|how about|and what about|and) (.{2,60})$/);
    if (about && !ai) { const x = about[1].replace(/^(his|the) /, ''); return { ask: KNOWN.some(([k]) => k === fold(plainWords(x))) ? `does he know ${x}` : x }; }
    if (ai) return null;

    const t = this.topic;
    if (!t) return MORE.test(q) && this.last ? { reply: { text: 'More about what? Pick a project, a skill, or his experience.', chat: true } } : null;
    const f = t.kind === 'project' ? this.project(q, t.id) : t.kind === 'skill' ? this.skill(q, t.id) : this.job(q, t.id);
    this.keep = !!f?.reply;
    return f;
  }

  /** Remember what was just said, and suggest what could come next. */
  after(question: string, text: string, chat = false): Next {
    this.last = text;
    this.offer = '';
    const kept = this.keep;
    this.keep = false;
    const hook = text.match(/[Ss]hall I (open the job matcher|start a mock interview|give you a guided tour|help you write to him)\?/)?.[1];
    if (hook) { this.offer = hook.startsWith('help') ? 'draft a message' : hook.startsWith('open') ? 'match a job description' : hook.startsWith('start') ? 'mock interview' : 'start the tour'; return { ask: '', chips: ['Yes', 'No thanks'] }; }
    if (/what should i call you/i.test(text)) { this.askedName = true; return { ask: '', chips: [] }; }
    if (/hiring, learning, or just exploring\?/.test(text)) return { ask: '', chips: ['I’m hiring', 'I’m learning', 'Just exploring'] };
    if (chat) {
      if (!this.askedWho && /\b(hi|hello|hey|there|hear me|alpha|how are you|good (morning|afternoon|evening)|vanakkam)\b/i.test(question)) { this.askedWho = true; this.askedName = !this.name; return { ask: this.name ? 'Are you hiring, learning, or just exploring?' : 'By the way, what should I call you?', chips: ['I’m hiring', 'I’m learning', 'Just exploring'] }; }
      return { ask: '', chips: ['His projects', 'His skills', 'Start the tour'] };
    }
    const found = kept ? this.topic : this.find(`${question} ${text}`, question);
    if (found) this.topic = found;
    const t = found ?? null;
    if (t?.kind === 'project') {
      const i = PROJECTS.findIndex(p => p.title === t.id), next = PROJECTS[(i + 1) % PROJECTS.length];
      const left = (this.told.get(t.id) ?? 3) < PROJECTS[i].features.length;
      this.offer = left ? 'tell me more' : `tell me about the ${next.title}`;
      return { ask: this.once(left ? `Want to hear more about ${t.id}?` : `Shall I tell you about ${next.title}?`), chips: [...(left ? ['Tell me more'] : []), 'Which technology?', 'Show it', `About ${next.title}`] };
    }
    if (t?.kind === 'skill') {
      const e = evidence(t.id);
      this.offer = e.projects.length ? 'show me the project' : 'another skill';
      return { ask: this.once(e.projects.length ? `Shall I show you the project where he used ${t.id}?` : ''), chips: ['Where did he use it?', ...(e.projects.length ? ['Show me the project'] : []), 'Another skill'] };
    }
    if (t?.kind === 'job') { this.offer = t.id + 1 < EXPERIENCE.length ? 'before that' : 'his projects'; return { ask: this.once(t.id + 1 < EXPERIENCE.length ? 'Want to hear what he did before that?' : 'Shall I show you his projects?'), chips: ['Which technology?', 'What does he do there?', t.id + 1 < EXPERIENCE.length ? 'Before that?' : 'His projects'] }; }
    return { ask: '', chips: ['His projects', 'His skills', 'Start the tour'] };
  }

  /** ask each question only once, so it never nags */
  private once(q: string) {
    if (!q || this.asks.has(q)) return '';
    this.asks.add(q);
    return q;
  }

  private find(all: string, question: string): Topic | null {
    const q = question.toLowerCase(), hay = ` ${fold(plainWords(question))} `;
    const p = PROJECTS.find(x => q.includes(x.title.toLowerCase())) ?? PROJECTS.find(x => ALIAS.some(([r, t]) => t === x.title && r.test(q)));
    if (p) return { kind: 'project', id: p.title };
    const s = KNOWN.find(([k]) => hay.includes(` ${k} `));
    if (s) return { kind: 'skill', id: s[1] };
    if (/\b(experience|job|work|career|company|intern)/.test(q)) return { kind: 'job', id: /intern|before that/.test(q) ? EXPERIENCE.length - 1 : 0 };
    const said = PROJECTS.find(x => all.slice(question.length).trim().startsWith(x.title));
    if (said) return { kind: 'project', id: said.title };
    if (/\bbefore that\b/.test(q)) return { kind: 'job', id: EXPERIENCE.length - 1 };
    return this.topic && /^(tell me more|more|which technology|show|when|where|another|what does|go on|continue|details)/.test(q) ? this.topic : null;
  }

  private project(q: string, title: string): Follow | null {
    const i = PROJECTS.findIndex(x => x.title === title), p = PROJECTS[i];
    if (MORE.test(q)) {
      const from = this.told.get(title) ?? 3;
      const part = p.features.slice(from, from + 2);
      this.told.set(title, from + 2);
      return { reply: { text: part.length ? `More on ${title}: ${part.join('. ')}.` : `That's everything I have on ${title}.`, open: 'projects' } };
    }
    if (/\b(tech|technolog|stack|built with|languages?|tools?|made with)/.test(q)) return { reply: { text: `${title} uses ${list(p.tech)}.` } };
    if (/^(when|how long|what year|since when)/.test(q)) return { reply: { text: `${title}: ${p.period.replace('–', 'to')}, at ${p.org}.` } };
    if (/\b(link|website|url|visit|open it|live)\b/.test(q)) return { reply: p.link ? { text: `${title} is live at ${p.link.replace('https://', '')}.`, url: p.link, label: `Visit ${title}` } : { text: `${title} was an internship project, so there is no public link.` } };
    if (/^(show|see|open|let me see|take me)/.test(q) && q.split(' ').length <= 5 && !/\b(skills?|experience|education|contact|notes|about|projects|resume|home|ai|tour)\b/.test(q)) return { reply: { text: `Here's ${title}.`, open: 'projects', project: title } };
    if (/^(why|how hard|what was (the )?hard|hardest|challenge)/.test(q)) return { reply: { text: `The site doesn't say that about ${title}. Kishore can tell you himself: shall I help you write to him?`, chat: true } };
    if (/^(next|another|other|different|one more)( one| project)?$/.test(q)) return { ask: `tell me about the ${PROJECTS[(i + 1) % PROJECTS.length].title}` };
    return null;
  }

  private skill(q: string, name: string): Follow | null {
    const e = evidence(name);
    if (/^(where|which project|proof|prove|how did he use|show proof)/.test(q) || MORE.test(q)) return { reply: { text: e.projects.length || e.roles.length ? `Kishore used ${name} on ${list([...e.projects, ...e.roles.map(r => `in his job as ${r}`)])}.` : `${name} is in his skills list, with no project named on this site.` } };
    if (/^(show|see|open|let me see|take me)/.test(q) && e.projects.length && !/\b(skills?|experience|education|contact|notes|about|projects|resume|home|ai|tour)\b/.test(q)) return { reply: { text: `Here's ${e.projects[0]}, where he used ${name}.`, open: 'projects', project: e.projects[0] } };
    if (/^(how good|how long|how many years|what level|is he (good|expert))/.test(q)) return { reply: { text: `The site doesn't rate skills. What it shows: ${name} in ${e.projects.length} project${e.projects.length === 1 ? '' : 's'} and ${e.roles.length} job${e.roles.length === 1 ? '' : 's'}.` } };
    if (/^(next|another|other|different)( one| skill)?$/.test(q)) return { ask: SKILLS[(SKILLS.indexOf(name) + 1) % SKILLS.length] };
    return null;
  }

  private job(q: string, i: number): Follow | null {
    const e = EXPERIENCE[i];
    if (/\b(tech|technolog|stack|languages?|tools?)/.test(q)) return { reply: { text: `At ${e.company} he works with ${list(e.tech)}.`.replace('works', e.current ? 'works' : 'worked') } };
    if (/^(before that|and before|previous|earlier|last job)/.test(q) && EXPERIENCE[i + 1]) { const b = EXPERIENCE[i + 1]; this.topic = { kind: 'job', id: i + 1 }; return { reply: { text: `Before that, he spent ${b.duration} as a ${b.role} at ${b.company}, building ${list(b.projects)}.`, open: 'experience' } }; }
    if (/^(what does he do|what did he do|duties|responsibilit|role)/.test(q) || MORE.test(q)) return { reply: { text: e.current ? `His work there: ${RESPONSIBILITIES.slice(0, 3).join('. ')}.` : e.summary } };
    if (/^(when|how long|since when)/.test(q)) return { reply: { text: `${e.period.replace('–', 'to')}, ${e.duration}, at ${e.company}.` } };
    return null;
  }
}

/** The robot's reaction to what somebody typed. */
export function moodFor(text: string): string | null {
  const q = text.toLowerCase();
  if (/\b(love|cute|beautiful|sweet)\b|thank/.test(q)) return 'love';
  if (/\b(joke|haha|lol|funny|hehe)\b/.test(q)) return 'giggle';
  if (/\b(wow|amazing|awesome|incredible|super)\b/.test(q)) return 'wow';
  if (/\b(dance|party|congrat|celebrate|selected|offer letter)/.test(q)) return 'party';
  if (/\b(stupid|useless|bad|dumb|hate|sad|boring|rejected)\b/.test(q)) return 'sad';
  if (/\b(bye|good night|see you)\b/.test(q)) return 'highfive';
  if (/\b(hi|hello|hey|there)\b/.test(q)) return 'happy';
  return null;
}
