/**
 * Builds the meaning-based search files in public/assets/study/semantic/ from the note files.
 *   npm run semantic            (re-uses model.bin and vocab.txt, rebuilds the note vectors)
 *   npm run semantic -- <dir>   (also rebuilds the model from potion-base-2M's model.safetensors and tokenizer.json)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = new URL('..', import.meta.url);
const out = new URL('public/assets/study/semantic/', root);
mkdirSync(out, { recursive: true });

const { outputFiles } = await build({ entryPoints: [new URL('src/app/core/semantic.ts', root).pathname.replaceAll('%20', ' ')], bundle: true, format: 'esm', write: false });
const { readModel, embed } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));

const from = process.argv[2];
if (from) {
  const st = readFileSync(join(from, 'model.safetensors'));
  const head = Number(st.readBigUInt64LE(0));
  const { embeddings } = JSON.parse(st.subarray(8, 8 + head).toString());
  const [rows, dim] = embeddings.shape;
  const f = new Float32Array(st.buffer.slice(st.byteOffset + 8 + head + embeddings.data_offsets[0], st.byteOffset + 8 + head + embeddings.data_offsets[1]));
  const bin = new ArrayBuffer(8 + rows * 4 + rows * dim);
  new Uint32Array(bin, 0, 2).set([rows, dim]);
  const scale = new Float32Array(bin, 8, rows), weights = new Int8Array(bin, 8 + rows * 4, rows * dim);
  for (let r = 0; r < rows; r++) {
    const row = f.subarray(r * dim, (r + 1) * dim);
    const max = row.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
    scale[r] = max / 127;
    for (let d = 0; d < dim; d++) weights[r * dim + d] = Math.round(row[d] / scale[r]);
  }
  const vocab = Object.entries(JSON.parse(readFileSync(join(from, 'tokenizer.json'), 'utf8')).model.vocab).sort((a, b) => a[1] - b[1]).map(v => v[0]);
  writeFileSync(new URL('model.bin', out), Buffer.from(bin));
  writeFileSync(new URL('vocab.txt', out), vocab.join('\n') + '\n');
  writeFileSync(new URL('LICENSE.txt', out), 'model.bin and vocab.txt are derived from minishlab/potion-base-2M (Model2Vec), MIT License.\nhttps://huggingface.co/minishlab/potion-base-2M\nThe weights were rounded to 8 bits.\n');
}

const bytes = readFileSync(new URL('model.bin', out));
const model = readModel(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length), readFileSync(new URL('vocab.txt', out), 'utf8'));
const study = new URL('public/assets/study/', root);
const index = JSON.parse(readFileSync(new URL('search-index.json', study), 'utf8'));
const chapters = new Map();
const notes = key => {
  if (!chapters.has(key)) { let m = new Map(); try { m = new Map(JSON.parse(readFileSync(new URL(`notes/${key}.json`, study), 'utf8'))); } catch { /* chapter without notes */ } chapters.set(key, m); }
  return chapters.get(key);
};
const vectors = new Int8Array(index.length * model.dim);
index.forEach(([guide, topic, q], i) => {
  const v = embed(`${q} ${q} ${(notes(`${guide}-${topic}`).get(q) ?? '').slice(0, 220)}`, model);
  for (let d = 0; d < model.dim; d++) vectors[i * model.dim + d] = Math.round(v[d] * 127);
});
writeFileSync(new URL('notes.bin', out), Buffer.from(vectors.buffer));
console.log(`${index.length} notes, ${model.dim} dimensions`);
