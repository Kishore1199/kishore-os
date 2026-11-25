/**
 * Meaning-based search with a tiny static embedding model (Model2Vec potion-base-2M, MIT licence).
 * Text → word pieces → the average of their vectors. No AI runtime, about 2 MB, all in the browser.
 */
export interface SemanticModel { vocab: Map<string, number>; scale: Float32Array; weights: Int8Array; dim: number; }

/** model.bin: [rows, dim] as uint32, one float32 scale per row, then int8 weights */
export function readModel(bin: ArrayBuffer, vocabText: string): SemanticModel {
  const [rows, dim] = new Uint32Array(bin, 0, 2);
  const vocab = new Map(vocabText.replace(/\n$/, '').split('\n').map((w, i) => [w, i] as const));
  if (vocab.size !== rows || bin.byteLength !== 8 + rows * 4 + rows * dim) throw new Error('semantic model files do not match');
  return { vocab, dim, scale: new Float32Array(bin, 8, rows), weights: new Int8Array(bin, 8 + rows * 4, rows * dim) };
}

/** BERT-style: lower case without accents, split on spaces and punctuation, then greedy longest word pieces. */
export function wordPieces(text: string, vocab: Map<string, number>): number[] {
  const ids: number[] = [];
  const words = text.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];
  for (const word of words) {
    const pieces: number[] = [];
    for (let from = 0; from < word.length;) {
      let to = word.length, id: number | undefined;
      for (; to > from; to--) { id = vocab.get((from ? '##' : '') + word.slice(from, to)); if (id !== undefined) break; }
      if (id === undefined) { pieces.length = 0; break; } // an unknown word is skipped
      pieces.push(id);
      from = to;
    }
    ids.push(...pieces);
  }
  return ids;
}

export function embed(text: string, m: SemanticModel): Float32Array {
  const out = new Float32Array(m.dim);
  for (const id of wordPieces(text, m.vocab)) {
    const s = m.scale[id], at = id * m.dim;
    for (let d = 0; d < m.dim; d++) out[d] += m.weights[at + d] * s;
  }
  const len = Math.hypot(...out) || 1;
  for (let d = 0; d < m.dim; d++) out[d] /= len;
  return out;
}

/** `vectors`: one unit-length int8 row per note, in the order of the question index. */
export function nearest(query: Float32Array, vectors: Int8Array, max: number): { i: number; score: number }[] {
  const dim = query.length, n = vectors.length / dim;
  const scores = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let d = 0, at = i * dim; d < dim; d++) s += query[d] * vectors[at + d];
    scores[i] = s / 127;
  }
  return [...scores.keys()].sort((a, b) => scores[b] - scores[a]).slice(0, max).map(i => ({ i, score: scores[i] }));
}
