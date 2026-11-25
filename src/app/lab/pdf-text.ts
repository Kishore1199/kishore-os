const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PAGES = 8;

/** Reads a PDF or text file in the browser. The file itself is never uploaded. */
export async function fileText(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('That file is over 5 MB.');
  const pdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!pdf && !/^text\//.test(file.type) && !/\.(txt|md)$/i.test(file.name)) throw new Error('Please choose a PDF or text file.');
  if (!pdf) return (await file.text()).slice(0, 20000);
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = new URL('assets/pdf/pdf.worker.min.mjs', document.baseURI).href;
  const task = lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false } as Parameters<typeof lib.getDocument>[0]);
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const { items } = await (await doc.getPage(n)).getTextContent();
      pages.push(items.map(i => ('str' in i ? i.str + (i.hasEOL ? '\n' : ' ') : '')).join(''));
    }
    const text = pages.join('\n').replace(/[ \t]+/g, ' ').trim().slice(0, 20000);
    if (text.length < 40) throw new Error('No text was found. It may be a scanned image.');
    return text;
  } finally { void task.destroy(); }
}
