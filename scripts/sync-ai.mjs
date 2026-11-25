/**
 * Copies the files that are the same on both sites from portfolio-3d, which is their source.
 *   npm run sync-ai            shows what would change
 *   npm run sync-ai -- --write copies it (needs a clean git tree for those files, so nothing is lost)
 * Files that differ on purpose are not listed here, so they are never overwritten.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const to = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(to, '..', 'portfolio-3d');
if (!existsSync(from)) { console.error(`portfolio-3d not found at ${from}`); process.exit(1); }

const core = ['agent.service', 'ai-budget', 'cloud.service', 'contact-draft.service', 'device-ai.service', 'dialogue', 'evidence', 'feedback.service', 'github.service', 'hiring-panel', 'interview', 'interview.service',
  'job-match', 'job-match.service', 'language.service', 'looks-like-job', 'notes.service', 'offline.service', 'page-commands', 'semantic', 'small-talk', 'structured-ai.service', 'trace.store', 'visitor-memory.service', 'voice.service', 'webmcp.service'];
const ownLab = ['lab-dialog.ts', 'lab-router.ts', 'lab-tools.ts', 'lab-views.ts', 'game-views.ts', 'saved.store.ts', 'evals.ts'];
const files = [
  ...core.map(f => `src/app/core/${f}.ts`),
  ...readdirSync(join(from, 'src/app/lab')).filter(f => f.endsWith('.ts') && !ownLab.includes(f)).map(f => `src/app/lab/${f}`),
  ...['robot', 'interview', 'job-match', 'dialog-styles'].map(f => `src/app/layout/${f}.ts`),
  'src/app/sections/ai-list.ts', 'src/app/data/study.data.ts',
  ...['build-notes', 'build-semantic', 'run-evals'].map(f => `scripts/${f}.mjs`),
];
const text = p => (existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null);
const changed = files.filter(f => text(join(from, f)) !== null && text(join(from, f)) !== text(join(to, f)));
if (!changed.length) { console.log(`All ${files.length} shared files are the same.`); process.exit(0); }
console.log(changed.map(f => `  ${f}`).join('\n'));
if (!process.argv.includes('--write')) { console.log(`\n${changed.length} file(s) differ. Run with --write to copy them.`); process.exit(0); }
const dirty = execFileSync('git', ['status', '--porcelain', '--', ...changed], { cwd: to, encoding: 'utf8' }).trim();
if (dirty) { console.error(`\nCommit or undo these first, so nothing is lost:\n${dirty}`); process.exit(1); }
for (const f of changed) writeFileSync(join(to, f), text(join(from, f)));
console.log(`\nCopied ${changed.length} file(s). Now run: npm run evals && npx ng build`);
