/**
 * Turns the two study guides into small per-chapter JSON files that ALPHA can search and quote:
 *   public/assets/study/notes/<guide>-<chapter>.json → [[question, answer], …]
 * Re-run after editing the guides:  npm run notes
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const DIR = new URL('../public/assets/study/', import.meta.url);
const OUT = new URL('notes/', DIR);
const GUIDES = { java: 'java-fullstack-guide.html', dsa: 'dsa-coding-prep.html' };

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = s => s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENT[e.toLowerCase()] ?? m));
/** only strips real tags, so unescaped generics such as List<Integer> inside code survive */
const TAG = /<\/?(?:a|b|i|em|strong|code|pre|p|ul|ol|li|br|hr|div|span|table|thead|tbody|tr|td|th|h[1-6]|sup|sub|small|figure|figcaption|section|details|summary|button|input|img|u|mark|kbd|blockquote)\b[^>]*>/gi;

function text(html) {
  return decode(html.replace(/\r/g, '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<(svg|style|script)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<span class="(?:lv|cx)[^"]*">[\s\S]*?<\/span>/gi, '')
    .replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, ' | ').replace(/<li[^>]*>/gi, '\n- ').replace(/<br[^>]*>|<\/(?:p|div|tr|pre|table|h[1-6]|ul|ol)>/gi, '\n')
    .replace(TAG, '')).replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [guide, file] of Object.entries(GUIDES)) {
  const html = readFileSync(new URL(file, DIR), 'utf8');
  const starts = [...html.matchAll(/<section class="topic"[^>]*\bid="([^"]+)"[^>]*>|<section[^>]*\bid="([^"]+)"[^>]*class="topic"[^>]*>/g)];
  starts.forEach((m, i) => {
    const body = html.slice(m.index, starts[i + 1]?.index ?? html.length);
    const qa = [...body.matchAll(/<details class="qa[^"]*"[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="ans">([\s\S]*?)<\/details>/g)]
      .map(x => [text(x[1]).replace(/\s+/g, ' '), text(x[2]).slice(0, 2400)]);
    if (!qa.length) return;
    total += qa.length;
    writeFileSync(new URL(`${guide}-${m[1] ?? m[2]}.json`, OUT), JSON.stringify(qa));
  });
}
console.log(`${total} notes written`);
