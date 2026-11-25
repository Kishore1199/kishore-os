/** Every tool in the AI Lab. Also the /lab/<id> addresses. */
export const LAB_IDS = ['twin', 'explore', 'skills', 'recruiter', 'resume', 'cover-letter', 'email', 'career', 'compare', 'github', 'docs', 'architecture',
  'java', 'spring-boot', 'sql', 'angular', 'microservices', 'diagram', 'review', 'debug', 'quiz', 'roadmap', 'explain',
  'graph', 'timeline', 'navigate', 'evaluate', 'team', 'accessibility', 'saved',
  'evals', 'trace', 'semantic', 'sql-run', 'run-code', 'meeting', 'offline', 'guestbook',
  'detective', 'rps', 'race', 'studio', 'daily'] as const;
export type LabId = (typeof LAB_IDS)[number];
export const labId = (v: unknown): LabId | undefined => LAB_IDS.find(x => x === v);
