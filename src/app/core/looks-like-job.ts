/** Long text that reads like a job advert, e.g. pasted into the chat by mistake. */
export function looksLikeJob(text: string): boolean {
  if (text.length < 300) return false;
  const signs = [/responsibilit/i, /require/i, /qualification/i, /experience/i, /skills?\b/i, /job description|about the role|we are (looking|hiring)/i, /years/i];
  return signs.filter(r => r.test(text)).length >= 3;
}
