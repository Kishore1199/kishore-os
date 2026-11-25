/** Reads "Tuesday 4 pm for 30 minutes" in the visitor's own time zone. No AI. */
export interface Meeting { start: Date; minutes: number; topic: string; }

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function parseMeeting(text: string, now = new Date()): { start: Date; minutes: number } | string {
  const t = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
  const dur = t.match(/\b(?:for )?(\d{1,3})\s*-?\s*(minutes?|mins?|hours?|hrs?)\b/) ?? (/\bhalf an hour\b/.test(t) ? ['', '30', 'min'] : /\ban hour\b/.test(t) ? ['', '60', 'min'] : null);
  const minutes = dur ? Math.min(240, Math.max(10, Number(dur[1]) * (/^h/.test(dur[2]) ? 60 : 1))) : 30;
  const clock = t.replace(/\b(?:for )?\d{1,3}\s*-?\s*(minutes?|mins?|hours?|hrs?)\b/g, ' ');

  let h = -1, m = 0;
  const ampm = clock.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?=\W)/), h24 = clock.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (ampm) {
    if (Number(ampm[1]) < 1 || Number(ampm[1]) > 12 || Number(ampm[2] ?? 0) > 59) return 'I could not read that time.';
    h = (Number(ampm[1]) % 12) + (ampm[3][0] === 'p' ? 12 : 0); m = Number(ampm[2] ?? 0);
  }
  else if (h24) { h = Number(h24[1]); m = Number(h24[2]); }
  else if (/\bnoon\b/.test(clock)) h = 12;
  else return 'Please add a time, for example "Tuesday 4 pm".';

  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  const iso = clock.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  const named = clock.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join('|')})[a-z]*|\\b(${MONTHS.join('|')})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
  const wd = DAYS.findIndex(x => new RegExp(`\\b${x}\\b|\\b${x.slice(0, 3)}\\b`).test(clock));
  if (iso) {
    d.setFullYear(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (d.getMonth() !== Number(iso[2]) - 1) return 'That date does not exist.';
  } else if (named) {
    const month = MONTHS.indexOf(named[2] ?? named[3]), day = Number(named[1] ?? named[4]);
    d.setMonth(month, day);
    if (d.getMonth() !== month) return 'That date does not exist.';
    if (d <= now) d.setFullYear(d.getFullYear() + 1);
  } else if (/\btomorrow\b/.test(clock)) d.setDate(d.getDate() + 1);
  else if (wd >= 0) {
    let add = (wd - d.getDay() + 7) % 7;
    if (!add && d <= now) add = 7;
    if (/\bnext\b/.test(clock) && add < 7 && wd > now.getDay()) add += 7;
    d.setDate(d.getDate() + add);
  } else if (!/\btoday\b/.test(clock)) return 'Please add a day, for example "tomorrow" or "12 December".';
  if (d <= now) return 'That time has already passed.';
  return { start: d, minutes };
}

const utc = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n');
/** iCalendar lines are at most 75 bytes; longer ones continue after a space */
const foldLine = (l: string) => { const out: string[] = []; let cur = ''; for (const ch of l) { if (new TextEncoder().encode(cur + ch).length > 73) { out.push(cur); cur = ' '; } cur += ch; } return [...out, cur].join('\r\n'); };

export function ics(m: Meeting, uid: string, now = new Date()): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kishore-portfolio//ALPHA//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${utc(now)}`, `DTSTART:${utc(m.start)}`, `DTEND:${utc(new Date(+m.start + m.minutes * 60000))}`,
    `SUMMARY:${esc(m.topic || 'Call with Kishore V')}`, `DESCRIPTION:${esc('Proposed from the portfolio. Not confirmed by Kishore yet.')}`, 'STATUS:TENTATIVE', 'END:VEVENT', 'END:VCALENDAR'].map(foldLine).join('\r\n') + '\r\n';
}

export const when = (d: Date, timeZone?: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone, timeZoneName: 'short' }).format(d);

export const meetingMail = (m: Meeting, zone?: string) => ({
  subject: `Meeting request: ${(m.topic || 'a call').slice(0, 70)}`,
  message: `Hi Kishore,\n\nCould we meet on ${when(m.start, 'Asia/Kolkata')} (${when(m.start, zone)} for me) for ${m.minutes} minutes?${m.topic ? ` I would like to talk about ${m.topic}.` : ''}\n\nPlease let me know if that works, or suggest another time.`,
});
