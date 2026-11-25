/** A small, safe Markdown reader: the result is data that Angular renders, never HTML. */
export interface Span { t: string; b?: boolean; c?: boolean; }
export type Block =
  | { k: 'h' | 'p'; spans: Span[] }
  | { k: 'ul' | 'ol'; items: Span[][] }
  | { k: 'code'; lang: string; text: string }
  | { k: 'mermaid'; text: string }
  | { k: 'table'; head: Span[][]; rows: Span[][][] };

export function spans(s: string): Span[] {
  const out: Span[] = [];
  // links become their text, so a model can't smuggle in an address
  for (const part of s.replace(/!?\[([^\]]*)\]\((?:[^()]|\([^)]*\))*\)/g, '$1').split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) out.push({ t: part.slice(2, -2), b: true });
    else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) out.push({ t: part.slice(1, -1), c: true });
    else out.push({ t: part });
  }
  return out;
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map(c => spans(c.trim()));

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r/g, '').split('\n');
  const out: Block[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*([\w+#-]*)/);
    if (fence) {
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith(fence[1]); i++) body.push(lines[i]);
      i++;
      const text = body.join('\n').trimEnd();
      if (text) out.push(fence[2].toLowerCase() === 'mermaid' ? { k: 'mermaid', text } : { k: 'code', lang: fence[2].toLowerCase(), text });
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^#{1,6}\s+(.*)/);
    if (h) { out.push({ k: 'h', spans: spans(h[1].replace(/\s#+$/, '')) }); i++; continue; }
    if (line.includes('|') && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1] ?? '') && (lines[i + 1] ?? '').includes('|')) {
      const head = cells(line), rows: Span[][][] = [];
      for (i += 2; i < lines.length && lines[i].includes('|') && lines[i].trim(); i++) rows.push(cells(lines[i]));
      out.push({ k: 'table', head, rows });
      continue;
    }
    const li = /^\s*(?:[-*•]|(\d+)[.)])\s+(.*)/;
    const first = line.match(li);
    if (first) {
      const k = first[1] ? 'ol' : 'ul', items: Span[][] = [];
      for (let m; i < lines.length && (m = lines[i].match(li)); i++) items.push(spans(m[2]));
      out.push({ k, items });
      continue;
    }
    const para: string[] = [];
    for (; i < lines.length && lines[i].trim() && !/^\s*(#{1,6}\s|```|~~~|[-*•]\s|\d+[.)]\s)/.test(lines[i]) && !(para.length && lines[i].trim().startsWith('|')); i++) para.push(lines[i].trim());
    if (!para.length) para.push(lines[i++].trim()); // never get stuck on an odd line
    out.push({ k: 'p', spans: spans(para.join(' ')) });
  }
  return out;
}

/** For reading aloud: prose only. */
export const speakable = (src: string) => parseMarkdown(src)
  .flatMap(b => (b.k === 'h' || b.k === 'p' ? [b.spans] : b.k === 'ul' || b.k === 'ol' ? b.items : []))
  .map(s => s.map(x => x.t).join('').trim().replace(/([^.!?:])$/, '$1.')).join(' ').slice(0, 1500);
