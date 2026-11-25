import { EDUCATION, EXPERIENCE, PROFILE, PROJECTS, Project, SKILL_CATEGORIES } from '../data/portfolio.data';
import { evidence, fold, plainWords, skillKey } from '../core/evidence';
import { buildReport, readKeywords } from '../core/job-match';
import { CHAPTERS } from '../core/notes.service';
import { LabResult } from './lab.types';

/** Everything the lab can do without any AI. Pure functions over the site's own data. */

const list = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const base = (t: string) => t.replace(/\s+v?\d[\d.x]*$/, '');
export const projectOf = (title: string) => PROJECTS.find(p => p.title === title) ?? PROJECTS[0];
const cell = (s: string) => s.replace(/\|/g, '/');

// ───────── portfolio ─────────

export function sharedTech(a: Project, b: Project): string[] {
  const keys = new Set(b.tech.map(skillKey));
  return a.tech.filter(t => keys.has(skillKey(t))).map(base);
}

export function exploreProject(title: string): string {
  const p = projectOf(title);
  const related = PROJECTS.filter(x => x !== p).map(x => ({ x, shared: sharedTech(p, x) })).filter(r => r.shared.length).sort((a, b) => b.shared.length - a.shared.length).slice(0, 3);
  return `## ${p.title}\n${p.org} · ${p.period} · ${p.badge}\n\n**What it does**\n${p.features.map(f => `- ${f}`).join('\n')}\n\n**Built with** ${p.tech.join(', ')}.\n\n${related.length ? `**Related projects**\n${related.map(r => `- ${r.x.title}: shares ${list(r.shared.slice(0, 4))}`).join('\n')}` : ''}`;
}

export function skillsAnalysis(group: string): string {
  const cats = SKILL_CATEGORIES.filter(c => group === 'All groups' || c.name === group);
  const rows = cats.flatMap(c => c.skills.map(s => ({ name: s.name, e: evidence(s.name) }))).sort((a, b) => b.e.projects.length + b.e.roles.length - a.e.projects.length - a.e.roles.length);
  const used = rows.filter(r => r.e.projects.length || r.e.roles.length);
  return `${used.length} of ${rows.length} skills are backed by a project or job on this site. The other ${rows.length - used.length} are listed, with no project named.\n\n| Skill | Projects | Jobs | Where |\n|---|---|---|---|\n${rows.map(r => `| ${r.name} | ${r.e.projects.length} | ${r.e.roles.length} | ${cell(r.e.projects.slice(0, 3).join(', ') || (r.e.roles.length ? 'Job description' : 'Skills list only'))} |`).join('\n')}`;
}

export function recruiterBrief(role: string): string {
  const now = EXPERIENCE.find(e => e.current) ?? EXPERIENCE[0];
  const degree = EDUCATION[EDUCATION.length - 1];
  return `## ${PROFILE.name}${role ? ` for ${role}` : ''}\n${PROFILE.role}, ${PROFILE.location}. Currently ${now.role} at ${now.company}.\n\n**Experience**\n${EXPERIENCE.map(e => `- ${e.role}, ${e.company} (${e.duration}): ${e.tech.slice(0, 6).join(', ')}`).join('\n')}\n\n**Headline projects**\n${PROJECTS.filter(p => p.link).slice(0, 2).map(p => `- ${p.title}: ${p.features[0]}`).join('\n')}\n\n**Education** ${degree.degree}, ${degree.year}.\n\n**Worth asking about**\n- Depth in skills that are listed without a project: ${SKILL_CATEGORIES.slice(0, 3).flatMap(c => c.skills).filter(s => { const e = evidence(s.name); return !e.projects.length && !e.roles.length; }).slice(0, 5).map(s => s.name).join(', ')}\n- Scope of ownership on 75Health\n- Notice period and location, which this site does not state`;
}

export function coverLetter(job: string): string {
  const read = readKeywords(job);
  const report = buildReport(read, 'keywords');
  const proven = report.rows.filter(r => r.status === 'proven' && r.projects.length).slice(0, 4);
  const gaps = report.rows.filter(r => r.status === 'gap' && r.must).slice(0, 2);
  return `Dear Hiring Team,\n\nI am writing about the ${read.role || 'open'} position. I am a ${PROFILE.role} with experience at ${EXPERIENCE.map(e => e.company).join(' and ')}.\n\n${proven.length ? `Your requirements match work I have done: ${list(proven.map(r => `${r.label} (${r.projects[0]})`))}.` : `My recent work includes ${list(PROJECTS.slice(0, 2).map(p => p.title))}.`}${gaps.length ? ` I have not listed ${list(gaps.map(g => g.label))} in my portfolio, and I would be glad to discuss how I would learn it.` : ''}\n\nOne project I would like to show you is ${PROJECTS[0].title}: ${PROJECTS[0].features[0].charAt(0).toLowerCase()}${PROJECTS[0].features[0].slice(1)}.\n\nThank you for your time. I would welcome a conversation.\n\nKind regards,\n${PROFILE.name}`;
}

export const EMAIL_KINDS = ['Interview invitation', 'Freelance enquiry', 'Technical question', 'Referral', 'Thank-you note'] as const;
export function emailTemplate(kind: string, details: string): string {
  const d = details.trim() ? ` ${details.trim().replace(/\s+/g, ' ')}${/[.!?]$/.test(details.trim()) ? '' : '.'}` : '';
  const body: Record<string, [string, string]> = {
    'Interview invitation': ['Interview invitation', `I came across your portfolio and would like to invite you to an interview.${d} Please let me know which times suit you.`],
    'Freelance enquiry': ['Freelance project', `I have a project that looks like a good fit for your skills.${d} Are you available, and could we arrange a short call?`],
    'Technical question': ['A question about your work', `I enjoyed reading about your projects and have a question.${d} I would appreciate your thoughts.`],
    'Referral': ['Referral', `I would like to refer you for a role.${d} Would you be interested in hearing more?`],
    'Thank-you note': ['Thank you', `Thank you for your time.${d} I look forward to staying in touch.`],
  };
  const [subject, text] = body[kind] ?? body['Technical question'];
  return `Subject: ${subject}\n\nHi Kishore,\n\n${text}\n\nBest regards`;
}

/** "Subject: …" + message → its parts. */
export function splitEmail(text: string): { subject: string; message: string } {
  const m = text.replace(/\*\*/g, '').trim().match(/^subject:\s*(.+)\n+([\s\S]+)$/i);
  return m ? { subject: m[1].trim().slice(0, 100), message: m[2].trim().slice(0, 1500) } : { subject: 'Message from your portfolio', message: text.trim().slice(0, 1500) };
}

export function compareProjects(a: string, b: string): string {
  const p = projectOf(a);
  const q = a === b ? PROJECTS.find(x => x !== p)! : projectOf(b);
  const shared = sharedTech(p, q), keys = new Set(shared.map(skillKey));
  const only = (x: Project) => x.tech.filter(t => !keys.has(skillKey(t))).join(', ') || 'None';
  const row = (label: string, f: (x: Project) => string) => `| ${label} | ${cell(f(p))} | ${cell(f(q))} |`;
  return `| | ${p.title} | ${q.title} |\n|---|---|---|\n${[row('Organisation', x => x.org), row('When', x => x.period), row('Status', x => x.badge), row('Purpose', x => x.features[0]), row('Only here', only), row('Features listed', x => String(x.features.length)), row('Live', x => (x.link ? x.link.replace('https://', '') : 'No public link'))].join('\n')}\n\n**Shared technology:** ${shared.length ? list(shared) : 'none listed'}.`;
}

export function projectDocs(title: string): string {
  const p = projectOf(title);
  return `# ${p.title}\n\n${p.features[0]}.\n\n## Overview\n- Organisation: ${p.org}\n- Period: ${p.period}\n- Status: ${p.badge}${p.link ? `\n- Live: ${p.link}` : ''}\n\n## Features\n${p.features.map(f => `- ${f}`).join('\n')}\n\n## Technology\n| Area | Used |\n|---|---|\n${layers(p).filter(l => l.tech.length).map(l => `| ${l.name} | ${l.tech.join(', ')} |`).join('\n')}\n\n## Architecture\n\`\`\`mermaid\n${projectDiagram(p)}\n\`\`\`\n\nThis diagram is inferred from the technology list.`;
}

const LAYER: [string, RegExp][] = [
  ['Interface', /angular|html|css|bootstrap|typescript|javascript|jquery|twig|jsp|ajax/i],
  ['Security', /security|jwt/i],
  ['Data', /mysql|mongo|maria|hibernate|jpa/i],
  ['Delivery', /docker|google cloud|jenkins|maven|gradle|github|sentry|playwright|log4j|claude/i],
  ['Server', /./],
];
export function layers(p: Project): { name: string; tech: string[] }[] {
  const out = LAYER.map(([name]) => ({ name, tech: [] as string[] }));
  for (const t of p.tech) out[LAYER.findIndex(([, r]) => r.test(t))].tech.push(t);
  return [out[0], out[1], out[4], out[2], out[3]];
}
const safe = (s: string) => s.replace(/["\[\](){}<>|;`#]/g, ' ').replace(/\s+/g, ' ').trim();
export function projectDiagram(p: Project): string {
  const [ui, sec, server, data, ops] = layers(p);
  const label = (n: string, t: string[]) => `["${n}: ${safe(t.slice(0, 4).join(', '))}"]`;
  const chain: string[] = ['U(["Users"])'];
  if (ui.tech.length) chain.push(`UI${label('Interface', ui.tech)}`);
  if (sec.tech.length) chain.push(`SEC${label('Security', sec.tech)}`);
  if (server.tech.length) chain.push(`API${label('Server', server.tech)}`);
  if (data.tech.length) chain.push(`DB[("${safe(data.tech.slice(0, 4).join(', '))}")]`);
  return `flowchart LR\n  ${chain.join(' --> ')}${ops.tech.length ? `\n  OPS${label('Delivery', ops.tech)} -.-> ${server.tech.length ? 'API' : 'UI'}` : ''}`;
}

export function architecture(title: string): string {
  const p = projectOf(title);
  return `## How ${p.title} fits together\nThis is inferred from the technologies listed for the project. It is not an internal design document.\n\n\`\`\`mermaid\n${projectDiagram(p)}\n\`\`\`\n\n${layers(p).filter(l => l.tech.length).map(l => `- **${l.name}:** ${l.tech.join(', ')}`).join('\n')}`;
}

// ───────── career and resume ─────────

const ROLES: [string, string[]][] = [
  ['Java backend developer', ['Java', 'Spring Boot', 'Hibernate', 'MySQL', 'REST APIs', 'JUnit']],
  ['Java full-stack developer', ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'MySQL', 'REST APIs']],
  ['Angular frontend developer', ['Angular', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'RxJS']],
  ['Microservices engineer', ['Java', 'Spring Boot', 'Microservices', 'Kafka', 'Docker', 'Kubernetes']],
  ['DevOps engineer', ['Linux', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'AWS']],
  ['Data engineer', ['Python', 'SQL', 'Spark', 'Airflow', 'Kafka', 'AWS']],
  ['QA automation engineer', ['Java', 'Selenium', 'Playwright', 'JUnit', 'Jenkins', 'SQL']],
  ['Python backend developer', ['Python', 'Django', 'SQL', 'REST APIs', 'Docker', 'Git']],
  ['React frontend developer', ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Git']],
];
const found = (text: string) => new Set(readKeywords(text).requirements.filter(r => r.kind === 'skill').map(r => skillKey(r.text)));
export function career(skills: string, goal: string): LabResult {
  const mine = found(skills);
  const ranked = ROLES.map(([role, need]) => ({ role, have: need.filter(n => mine.has(skillKey(n))), miss: need.filter(n => !mine.has(skillKey(n))) }))
    .sort((a, b) => b.have.length - a.have.length).slice(0, 3);
  if (!ranked[0].have.length) return { text: 'I did not recognise any technologies in that. Try listing them, for example "Java, Spring Boot, SQL, Angular".' };
  const links = chaptersFor(ranked[0].miss);
  return { text: `${goal.trim() ? `Goal: ${goal.trim()}\n\n` : ''}${ranked.map((r, i) => `## ${i + 1}. ${r.role}\n- You have: ${r.have.join(', ') || 'none of the core skills yet'}\n- Learn next: ${r.miss.join(', ') || 'nothing from the core list'}`).join('\n\n')}`, links };
}
export function chaptersFor(skills: readonly string[]) {
  return skills.map(s => CHAPTERS.find(c => ` ${fold(plainWords(c.title))} `.includes(` ${skillKey(s)} `))).filter(c => !!c).slice(0, 4).map(c => ({ label: c.title, url: c.url }));
}

export function resumeChecks(text: string, target: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const has = (r: RegExp) => r.test(text);
  const verbs = new Set(text.toLowerCase().match(/\b(built|developed|designed|led|improved|reduced|increased|implemented|migrated|automated|created|delivered|optimi[sz]ed|launched|managed|upgraded|integrated)\b/g) ?? []).size;
  const numbers = (text.match(/\b\d+(?:\.\d+)?\s?(?:%|x\b|percent|users|million|k\b|hours|days|projects|clients|teams?)/gi) ?? []).length;
  const checks: [boolean, string, string][] = [
    [has(/[\w.+-]+@[\w-]+\.\w+/), 'Email address', 'Add an email address.'],
    [has(/\+?\d[\d ()-]{8,}/), 'Phone number', 'Add a phone number.'],
    [has(/linkedin\.com|github\.com|https?:\/\//i), 'Profile links', 'Link your LinkedIn, GitHub or portfolio.'],
    [has(/\b(experience|employment|work history)\b/i), 'Experience section', 'Add a clear "Experience" heading.'],
    [has(/\beducation\b/i), 'Education section', 'Add a clear "Education" heading.'],
    [has(/\bskills\b|technologies/i), 'Skills section', 'Add a clear "Skills" heading.'],
    [words >= 250 && words <= 900, `Length (${words} words)`, words < 250 ? 'It looks short. Aim for 250 to 900 words.' : 'It is long. Aim for one to two pages.'],
    [verbs >= 5, `Action verbs (${verbs})`, 'Start more bullets with verbs such as built, reduced or led.'],
    [numbers >= 3, `Measured results (${numbers})`, 'Add numbers: users, percentages, time saved.'],
    [!has(/\b(I am|I have|my)\b/), 'No first person', 'Drop "I" and "my" from bullets.'],
  ];
  const skills = readKeywords(text).requirements.filter(r => r.kind === 'skill').map(r => r.text);
  let match = '';
  if (target.trim()) {
    const mine = new Set(skills.map(skillKey));
    const need = readKeywords(target).requirements.filter(r => r.kind === 'skill').map(r => r.text);
    const miss = need.filter(n => !mine.has(skillKey(n)));
    match = need.length ? `\n\n## Against the target role\n- Keywords found: ${need.length - miss.length} of ${need.length}\n- Missing: ${miss.join(', ') || 'none'}` : '\n\n## Against the target role\nNo technologies were recognised in the target text.';
  }
  const ok = checks.filter(c => c[0]).length;
  return `## ${ok} of ${checks.length} checks passed\n\n| Check | Result |\n|---|---|\n${checks.map(([pass, name, fix]) => `| ${name} | ${pass ? 'Good' : fix} |`).join('\n')}\n\n**Skills recognised:** ${skills.slice(0, 25).join(', ') || 'none'}${match}`;
}

// ───────── developer tools ─────────

const JAVA_TYPES: Record<string, string> = { string: 'String', text: 'String', int: 'Integer', integer: 'Integer', number: 'Integer', long: 'Long', double: 'Double', decimal: 'BigDecimal', bigdecimal: 'BigDecimal', money: 'BigDecimal', boolean: 'Boolean', bool: 'Boolean', date: 'LocalDate', localdate: 'LocalDate', datetime: 'LocalDateTime', localdatetime: 'LocalDateTime' };
const RESERVED = new Set(['class', 'public', 'private', 'static', 'void', 'int', 'long', 'new', 'package', 'import', 'return', 'default', 'case', 'enum', 'interface', 'abstract', 'final', 'for', 'if', 'else', 'switch', 'this', 'super', 'try', 'catch', 'throw', 'throws', 'do', 'while', 'boolean', 'double', 'float', 'char', 'byte', 'short', 'id']);
const ident = (s: string) => s.replace(/[^A-Za-z0-9]/g, '');

/** "Product(name:String, price:BigDecimal)" or "Product with name, price" → a working CRUD skeleton. */
export function springCrud(request: string): string | null {
  const m = request.match(/\b([A-Z][A-Za-z0-9]*)\s*\(([^)]*)\)/) ?? request.match(/\b([A-Z][A-Za-z0-9]*)\s+(?:entity\s+)?with\s+(?:fields?\s+)?([^.\n]+)/);
  if (!m) return null;
  const name = ident(m[1]);
  const fields = m[2].split(/,|\band\b/).map(f => f.trim()).filter(Boolean).slice(0, 15).map(f => {
    const [a, b] = f.split(/\s*[:\s]\s*/);
    const n = ident(a ?? '');
    return { name: n.charAt(0).toLowerCase() + n.slice(1), type: JAVA_TYPES[(b ?? '').toLowerCase()] ?? (/(price|amount|total|cost)$/i.test(n) ? 'BigDecimal' : /(date|at)$/i.test(n) ? 'LocalDate' : /^(is|has)[A-Z]/.test(n) ? 'Boolean' : /(count|quantity|qty|age|stock)$/i.test(n) ? 'Integer' : 'String') };
  }).filter(f => /^[a-z]/.test(f.name) && !RESERVED.has(f.name));
  if (!fields.length) return null;
  const v = name.charAt(0).toLowerCase() + name.slice(1);
  const imports = [fields.some(f => f.type === 'BigDecimal') && 'import java.math.BigDecimal;', fields.some(f => f.type === 'LocalDate') && 'import java.time.LocalDate;', fields.some(f => f.type === 'LocalDateTime') && 'import java.time.LocalDateTime;'].filter(Boolean).join('\n');
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `## ${name} CRUD API\n\n\`\`\`java\npackage com.example.demo.${v.toLowerCase()};\n\n${imports ? imports + '\n' : ''}import jakarta.persistence.*;\n\n@Entity\n@Table(name = "${v.toLowerCase()}s")\npublic class ${name} {\n    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n${fields.map(f => `    private ${f.type} ${f.name};`).join('\n')}\n\n    public Long getId() { return id; }\n    public void setId(Long id) { this.id = id; }\n${fields.map(f => `    public ${f.type} get${cap(f.name)}() { return ${f.name}; }\n    public void set${cap(f.name)}(${f.type} ${f.name}) { this.${f.name} = ${f.name}; }`).join('\n')}\n}\n\`\`\`\n\n\`\`\`java\npackage com.example.demo.${v.toLowerCase()};\n\nimport org.springframework.data.jpa.repository.JpaRepository;\n\npublic interface ${name}Repository extends JpaRepository<${name}, Long> {}\n\`\`\`\n\n\`\`\`java\npackage com.example.demo.${v.toLowerCase()};\n\nimport java.util.List;\nimport org.springframework.http.HttpStatus;\nimport org.springframework.web.bind.annotation.*;\nimport org.springframework.web.server.ResponseStatusException;\n\n@RestController\n@RequestMapping("/api/${v.toLowerCase()}s")\npublic class ${name}Controller {\n    private final ${name}Repository repository;\n\n    public ${name}Controller(${name}Repository repository) { this.repository = repository; }\n\n    @GetMapping\n    public List<${name}> all() { return repository.findAll(); }\n\n    @GetMapping("/{id}")\n    public ${name} one(@PathVariable Long id) {\n        return repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));\n    }\n\n    @PostMapping\n    @ResponseStatus(HttpStatus.CREATED)\n    public ${name} create(@RequestBody ${name} ${v}) {\n        ${v}.setId(null);\n        return repository.save(${v});\n    }\n\n    @PutMapping("/{id}")\n    public ${name} update(@PathVariable Long id, @RequestBody ${name} ${v}) {\n        one(id);\n        ${v}.setId(id);\n        return repository.save(${v});\n    }\n\n    @DeleteMapping("/{id}")\n    @ResponseStatus(HttpStatus.NO_CONTENT)\n    public void delete(@PathVariable Long id) { repository.deleteById(id); }\n}\n\`\`\`\n\nDependencies: spring-boot-starter-web, spring-boot-starter-data-jpa and a JDBC driver. Add validation and security before real use.`;
}

export function microservices(request: string): string {
  const names = [...new Set(request.split(/,|\n|;|\band\b/).map(s => safe(s).replace(/\b(service|services|microservices?|an?|the|with|for|system|app|application)\b/gi, '').trim()).filter(s => s && s.length <= 28))].slice(0, 8);
  const svc = names.length >= 2 ? names : ['User', 'Order', 'Payment', 'Notification'];
  const id = (i: number) => `S${i}`;
  return `## Service outline\n\n\`\`\`mermaid\nflowchart TB\n  C(["Client"]) --> G["API gateway"]\n  G --> A["Auth: JWT"]\n${svc.map((s, i) => `  G --> ${id(i)}["${s} service"]\n  ${id(i)} --> D${i}[("${s} DB")]\n  ${id(i)} -.-> K{{"Kafka events"}}`).join('\n')}\n  R["Service registry"] -.-> G\n\`\`\`\n\n| Service | Owns | Publishes |\n|---|---|---|\n${svc.map(s => `| ${s} | ${s} data only | ${s.replace(/\s+/g, '')}Changed |`).join('\n')}\n\n- Each service has its own database, so no service reads another's tables.\n- Use synchronous REST through the gateway for queries, and Kafka events for follow-up work.\n- Add timeouts, retries and a circuit breaker to every remote call.\n- Trace requests with a correlation ID.${names.length >= 2 ? '' : '\n\nList your services, separated by commas, to replace this example.'}`;
}

/** "A -> B -> C" lines, or plain steps, to a flowchart. */
export function diagram(request: string): string {
  const ids = new Map<string, string>();
  const node = (raw: string) => {
    const label = safe(raw).slice(0, 60);
    if (!label) return '';
    const known = ids.get(label.toLowerCase());
    if (known) return known;
    const id = `N${ids.size}`;
    ids.set(label.toLowerCase(), id);
    return `${id}["${label}"]`;
  };
  const lines = request.split(/\n/).map(l => l.trim()).filter(Boolean);
  const out: string[] = [];
  if (lines.some(l => /->|→|=>/.test(l))) {
    for (const l of lines) {
      const parts = l.split(/\s*(?:-+>|→|=>)\s*/).map(node).filter(Boolean);
      if (parts.length) out.push('  ' + parts.join(' --> '));
    }
  } else {
    const steps = (lines.length > 1 ? lines : request.split(/,|;|\.\s|\bthen\b/i)).map(s => s.replace(/^\s*(?:\d+[.)]|[-*])\s*/, '')).map(node).filter(Boolean);
    if (steps.length) out.push('  ' + steps.join(' --> '));
  }
  return out.length ? `\`\`\`mermaid\nflowchart LR\n${out.slice(0, 40).join('\n')}\n\`\`\`` : 'Describe the steps, for example: Browser -> Gateway -> Order service -> MySQL';
}

const LINT: [RegExp, string, string][] = [
  [/catch\s*\([^)]*\)\s*\{\s*\}/, 'High', 'Empty catch block hides failures. Log or rethrow.'],
  [/(password|passwd|secret|api_?key|token)\s*[:=]\s*["'][^"']{4,}["']/i, 'High', 'Looks like a hard-coded secret. Move it to configuration.'],
  [/(select|insert|update|delete)\b[^;]*["']\s*\+\s*\w/i, 'High', 'SQL built by joining strings can be injected. Use parameters.'],
  [/\.innerHTML\s*=|bypassSecurityTrust|dangerouslySetInnerHTML/, 'High', 'Raw HTML can allow XSS. Bind text instead.'],
  [/\beval\s*\(/, 'High', 'eval runs arbitrary code. Avoid it.'],
  [/\w+\s*(==|!=)\s*"[^"]*"|"[^"]*"\s*(==|!=)\s*\w+/, 'Medium', 'In Java, compare strings with equals(), not == or !=.'],
  [/\.printStackTrace\(\)/, 'Medium', 'Use a logger instead of printStackTrace().'],
  [/catch\s*\(\s*(Exception|Throwable)\b/, 'Medium', 'Catch a specific exception.'],
  [/\bselect\s+\*/i, 'Medium', 'Select only the columns you need.'],
  [/@Autowired\s+(private|protected)/, 'Medium', 'Prefer constructor injection to field injection.'],
  [/\.subscribe\s*\(/, 'Medium', 'Make sure this subscription ends (async pipe or takeUntilDestroyed).'],
  [/\.get\(\)\s*;?/, 'Low', 'If this is an Optional, use orElseThrow() or orElse().'],
  [/:\s*any\b/, 'Low', 'Replace any with a real type.'],
  [/console\.log|System\.out\.print/, 'Low', 'Remove debug output or use a logger.'],
  [/\b(TODO|FIXME)\b/, 'Low', 'Unfinished work marker.'],
  [/\bnew Thread\s*\(/, 'Low', 'Prefer an ExecutorService or virtual threads.'],
];
export function review(code: string): string {
  const hits: string[] = [];
  code.split('\n').forEach((line, i) => { for (const [r, level, msg] of LINT) if (r.test(line) && !(msg.startsWith('In Java') && /===|!==/.test(line))) hits.push(`| ${i + 1} | ${level} | ${msg} |`); });
  if (/catch\s*\([^)]*\)\s*\{\s*\n\s*\}/.test(code)) hits.push('| – | High | Empty catch block hides failures. Log or rethrow. |');
  const long = code.split('\n').filter(l => l.length > 140).length;
  if (long) hits.push(`| – | Low | ${long} line${long > 1 ? 's are' : ' is'} over 140 characters. |`);
  return hits.length ? `## ${hits.length} pattern${hits.length > 1 ? 's' : ''} found\n\n| Line | Level | Note |\n|---|---|---|\n${hits.slice(0, 30).join('\n')}\n\nThese are pattern checks. They can be wrong, and they do not understand what the code is for.` : 'No common problem patterns were found. This only checks patterns, so it does not mean the code is correct.';
}

const ERRORS: [RegExp, string, string][] = [
  [/NullPointerException/, 'A method or field was used on a null reference.', 'Read the first line of the stack trace in your own package, find which value is null, and fix where it should have been set.'],
  [/LazyInitializationException/, 'A lazy association was read after the Hibernate session closed.', 'Fetch it in the query (join fetch or an entity graph), or map to a DTO inside the transaction.'],
  [/NoSuchBeanDefinitionException|required a bean of type/, 'Spring found no bean of that type.', 'Check the stereotype annotation, the component-scan package, profiles and conditions.'],
  [/BeanCurrentlyInCreationException|circular reference/i, 'Two beans depend on each other.', 'Extract the shared logic into a third bean.'],
  [/ConcurrentModificationException/, 'A collection was changed while being iterated.', 'Use removeIf, an iterator, or iterate over a copy.'],
  [/ClassCastException/, 'An object was cast to a type it is not.', 'Check raw types and generics near the first frame in your code.'],
  [/OutOfMemoryError/, 'The JVM ran out of memory.', 'Take a heap dump and look for growing collections, caches or large result sets.'],
  [/StackOverflowError/, 'Recursion never ends.', 'Check the base case, and bidirectional toString, hashCode or JSON mapping.'],
  [/NoSuchMethodError|NoClassDefFoundError|ClassNotFoundException/, 'A class or method is missing at run time.', 'Look for conflicting dependency versions with mvn dependency:tree or gradle dependencies.'],
  [/CORS|Access-Control-Allow-Origin/i, 'The browser blocked a cross-origin request.', 'Allow the exact origin on the server. It cannot be fixed in the browser code.'],
  [/ExpressionChangedAfterItHasBeenChecked|NG0100/, 'A binding changed after Angular checked it.', 'Move the change earlier, or use signals or computed values.'],
  [/NullInjectorError|NG0201|No provider for/, 'Angular has no provider for that token.', "Add providedIn: 'root' or a provider in the component or app config."],
  [/Cannot read propert(y|ies) of (undefined|null)/, 'A value was undefined when its property was read.', 'Check the async timing, and use a guard or optional chaining.'],
  [/Communications link failure|Connection refused|ECONNREFUSED/i, 'Nothing is listening at that host and port.', 'Check that the service is running, plus host, port, container network and firewall.'],
  [/Access denied for user/i, 'The database rejected the login.', "Check the user, password, host and that user's grants."],
  [/Duplicate entry|ConstraintViolationException|unique constraint/i, 'A unique or foreign-key rule was broken.', 'Check for existing rows and retries, and handle the conflict.'],
  [/Deadlock found|deadlock/i, 'Two transactions wait for each other.', 'Lock rows in the same order, keep transactions short, and retry.'],
  [/\b401\b|Unauthorized/, 'The request was not authenticated.', 'Check that the token is sent, valid and not expired.'],
  [/\b403\b|Forbidden/, 'The user is known but not allowed, or a CSRF check failed.', 'Check roles, method security and CSRF settings.'],
];
export function debug(error: string): string | null {
  const hits = ERRORS.filter(([r]) => r.test(error)).slice(0, 3);
  if (!hits.length) return null;
  const own = error.split('\n').find(l => /^\s*at /.test(l) && !/\b(java|javax|jakarta|sun|jdk|org\.(springframework|hibernate|apache|junit))\./.test(l));
  return `${hits.map(([r, why, fix]) => `## ${error.match(r)![0]}\n- **Likely cause:** ${why}\n- **Try:** ${fix}`).join('\n\n')}${own ? `\n\n**Start here:** \`${own.trim().slice(0, 160)}\`` : ''}`;
}

export const GOALS = ['Java backend', 'Java full stack', 'Angular frontend', 'DSA and coding interviews', 'DevOps basics'] as const;
const PLANS: Record<string, RegExp> = {
  'Java backend': /^(Core Java|Java Web & Database|Spring & APIs|Persistence)$/,
  'Java full stack': /^(Core Java|Spring & APIs|Persistence|Frontend)$/,
  'Angular frontend': /^(Frontend|Frontend coding)$/,
  'DSA and coding interviews': /^(DSA patterns|Java & Spring coding)$/,
  'DevOps basics': /^(DevOps & Monitoring|Engineering Practice|Distributed Systems)$/,
};
export function roadmap(goal: string, weeks: number): LabResult {
  const chapters = CHAPTERS.filter(c => c.questions > 0 && (PLANS[goal] ?? PLANS['Java full stack']).test(c.group));
  const n = Math.max(1, Math.min(weeks, chapters.length));
  const per = chapters.length / n;
  const plan = Array.from({ length: n }, (_, i) => chapters.slice(Math.round(i * per), Math.round((i + 1) * per)));
  return {
    text: `## ${goal} in ${n} week${n > 1 ? 's' : ''}\n${chapters.length} chapters, ${chapters.reduce((s, c) => s + c.questions, 0)} questions from the study notes.\n\n| Week | Chapters | Questions |\n|---|---|---|\n${plan.map((cs, i) => `| ${i + 1} | ${cs.map(c => cell(c.title)).join(', ')} | ${cs.reduce((s, c) => s + c.questions, 0)} |`).join('\n')}\n\nEnd each week with a mock interview on that week's chapters.`,
    links: plan[0].slice(0, 4).map(c => ({ label: c.title, url: c.url })),
  };
}

/** What an answer claims that the portfolio doesn't show. Used by the answer checker. */
export function unsupported(answer: string): string[] {
  return readKeywords(answer).requirements.filter(r => r.kind === 'skill' && !evidence(r.text).found).map(r => r.text);
}
export function evaluateLocally(question: string, answer: string): string {
  const words = answer.split(/\s+/).filter(Boolean).length;
  const asked = new Set(fold(plainWords(question)).split(' ').filter(w => w.length > 3));
  const said = new Set(fold(plainWords(answer)).split(' '));
  const overlap = [...asked].filter(w => said.has(w)).length;
  const odd = unsupported(answer);
  return `| Check | Result |\n|---|---|\n| Length | ${words} words${words < 8 ? ', very short' : words > 250 ? ', long' : ''} |\n| Uses the words of the question | ${asked.size ? `${overlap} of ${asked.size}` : 'No question given'} |\n| Technologies with no evidence on this site | ${odd.join(', ') || 'None'} |\n| Hedging | ${/\b(maybe|probably|might|i think|not sure)\b/i.test(answer) ? 'Yes' : 'No'} |\n\nThese are simple text checks. They do not judge whether the answer is true.`;
}

