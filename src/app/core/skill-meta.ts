import { SKILL_CATEGORIES } from '../data/portfolio.data';

/** Skill colors by name, so tech chips everywhere match the Skills section. */
const SKILL_COLORS = new Map(SKILL_CATEGORIES.flatMap(c => c.skills.map(s => [s.name, s.color] as const)));

/** Aliases for tech labels that differ from the Skills list. */
const ALIASES: Record<string, string> = {
  'Spring MVC': 'Spring',
  'Spring Cloud': 'Spring Cloud API Gateway',
  'Spring Cloud API Gateway': 'Spring Cloud API Gateway',
  'OpenEMR': 'OpenEMR',
  'AJAX': 'JavaScript',
};

/** "Java 21" → "Java", "Hibernate 6.x" → "Hibernate", "Spring Cloud API Gateway 2022.0.2" → "Spring Cloud API Gateway". */
export const baseSkillName = (label: string): string => {
  const base = label.replace(/\s+[\d.]+x?$/, '');
  return ALIASES[base] ?? base;
};

export const skillColor = (label: string): string =>
  SKILL_COLORS.get(baseSkillName(label)) ?? 'var(--accent)';
