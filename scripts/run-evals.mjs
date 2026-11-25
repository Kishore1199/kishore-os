/** Runs the scripted agent tests (no AI, no network):  npm run evals */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
// the notes are read from disk instead of the web
globalThis.fetch = async url => { try { const body = readFileSync(join(root, 'public', String(url)), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(body) }; } catch { return { ok: false, status: 404, json: async () => ({}) }; } };
const entry = `import '@angular/compiler';\nexport { runScripted, evalTable } from './src/app/lab/evals';\nexport { NotesService } from './src/app/core/notes.service';`;
const dir = mkdtempSync(join(root, 'node_modules', '.evals-'));
try {
  const r = await build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'error', external: ['firebase/*'], tsconfigRaw: { compilerOptions: { experimentalDecorators: true, useDefineForClassFields: false } } });
  const file = join(dir, 'evals.cjs');
  writeFileSync(file, r.outputFiles[0].contents);
  const { runScripted, evalTable, NotesService } = createRequire(import.meta.url)(file);
  const results = await runScripted(new NotesService());
  console.log(evalTable(results, 'Agent tests'));
  process.exitCode = results.every(x => x.ok) ? 0 : 1;
} finally { rmSync(dir, { recursive: true, force: true }); }
