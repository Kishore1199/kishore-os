import { ABOUT_HIGHLIGHTS, EXPERIENCE, PROJECTS, RESPONSIBILITIES, SKILL_CATEGORIES } from '../data/portfolio.data';

/** Where a skill shows up on this site. Plain data lookup, no AI. */

/** lower case, words only: "Node.js / REST" → "node js rest" */
export const plainWords = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').trim();
/** plain words without trailing versions: "Spring Boot 3.x" → "spring boot", "Java 8+" → "java" */
export const norm = (s: string) => plainWords(s.toLowerCase().replace(/\s+v?\d[\d.x]*\+?$/, '')).replace(/(\s+v?\d[\dx]*\+?)+$/, '');
/** ignore plurals, so "REST API" finds "REST APIs" */
export const fold = (s: string) => s.split(' ').map(w => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)).join(' ');

/** Other ways people write the same thing (after `norm`). Only true synonyms: never map a rival technology. */
export const ALIASES: Record<string, string> = {
  js: 'javascript', ts: 'typescript', html5: 'html', css3: 'css', springboot: 'spring boot', 'core java': 'java',
  sql: 'mysql', mongo: 'mongodb', 'mongo db': 'mongodb', 'my sql': 'mysql', gcp: 'google cloud', 'google cloud platform': 'google cloud',
  rest: 'rest apis', 'rest api': 'rest apis', 'restful api': 'rest apis', 'restful apis': 'rest apis', 'restful web services': 'rest apis', 'rest web services': 'rest apis', 'restful services': 'rest apis',
  'apache kafka': 'kafka', 'apache maven': 'maven', 'hibernate orm': 'hibernate', subversion: 'svn', 'json web token': 'jwt', 'json web tokens': 'jwt',
  microservice: 'microservices', 'microservice architecture': 'microservices', 'microservices architecture': 'microservices',
  'agile methodology': 'agile', 'agile methodologies': 'agile', 'agile development': 'agile', 'agile scrum': 'agile', copilot: 'github copilot', claude: 'claude ai', gemini: 'google gemini',
  'hl7 fhir': 'fhir', 'continuous integration': 'ci cd', cicd: 'ci cd', fullstack: 'full stack',
};

/** the text used to look a skill up */
export const skillKey = (skill: string) => { const s = norm(skill.replace(/\([^)]*\)/g, ' ').trim()); return fold(ALIASES[s] ?? s); };

/** whole-word match, so "Java" never matches "JavaScript" */
const mentions = (text: string, key: string) => ` ${fold(plainWords(text))} `.includes(` ${key} `);

export interface Evidence { skill: string; found: boolean; listedUnder: string[]; projects: string[]; roles: string[]; }

export function evidence(skill: string): Evidence {
  const key = skillKey(skill);
  const hit = (xs: readonly string[]) => !!key && xs.some(x => mentions(x, key));
  const listedUnder = SKILL_CATEGORIES.filter(c => hit(c.skills.map(k => k.name))).map(c => c.name);
  if (hit(ABOUT_HIGHLIGHTS.map(h => h.desc))) listedUnder.push('About');
  if (hit(RESPONSIBILITIES)) listedUnder.push('Responsibilities');
  const projects = PROJECTS.filter(p => hit(p.tech) || hit(p.features)).map(p => p.title);
  const roles = EXPERIENCE.filter(e => hit(e.tech) || hit([e.summary])).map(e => `${e.role} at ${e.company}`);
  return { skill, found: !!(listedUnder.length || projects.length || roles.length), listedUnder, projects, roles };
}
