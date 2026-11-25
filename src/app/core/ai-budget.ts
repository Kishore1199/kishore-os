/**
 * Free-tier guard. The Gemini quota is shared by every visitor, so each browser only gets a small
 * slice of it, and a rate-limit reply makes this browser back off instead of asking again.
 * This protects against ordinary use, not abuse: a visitor can always clear their storage.
 */
export const DAILY_REQUESTS = 15;
const MIN_REST_MS = 60_000;
const MAX_REST_MS = 60 * 60_000;
/** App Check, key or model problems don't fix themselves within one visit */
const SETUP_REST_MS = 10 * 60_000;
const KEY = 'kv-ai-budget';

interface State {
  /** Pacific date: Gemini's daily quotas reset at midnight Pacific time */
  day: string;
  /** requests made that day */
  n: number;
  /** no requests before this time */
  until: number;
  /** the project's daily quota is used up */
  out: boolean;
}

const DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
const today = () => DAY.format(Date.now());
const fresh = (until = 0): State => ({ day: today(), n: 0, until, out: false });

export class AiBudget {
  /** used when storage is unavailable, and so a failed write is never forgotten */
  private mem = fresh();
  private strikes = 0;

  canAsk(): boolean {
    const s = this.read();
    return !s.out && s.n < DAILY_REQUESTS && Date.now() >= s.until;
  }

  remaining(): number {
    return this.canAsk() ? DAILY_REQUESTS - this.read().n : 0;
  }

  /** Call right before sending a request. */
  count() {
    const s = this.read();
    this.write({ ...s, n: s.n + 1 });
  }

  /** Call when a request succeeded. */
  ok() {
    this.strikes = 0;
  }

  /** Call when a request failed. Rate limits (HTTP 429) and setup problems (401, 403, 404) cause a rest. */
  failed(e: unknown) {
    const data = (e as { customErrorData?: { status?: number; errorDetails?: Record<string, unknown>[] } } | null)?.customErrorData;
    const s = this.read();
    if (data?.status === 401 || data?.status === 403 || data?.status === 404) { this.write({ ...s, until: Date.now() + SETUP_REST_MS }); return; }
    if (data?.status !== 429) return;
    const details = Array.isArray(data.errorDetails) ? data.errorDetails : [];
    // quota ids look like "GenerateRequestsPerDayPerProjectPerModel-FreeTier"
    if (/PerDay/i.test(JSON.stringify(details))) { this.write({ ...s, out: true }); return; }
    const asked = parseFloat(String(details.find(d => typeof d['retryDelay'] === 'string')?.['retryDelay'] ?? '')) * 1000 || 0;
    const backoff = MIN_REST_MS * 5 ** this.strikes++; // 1 min, 5 min, 25 min, then an hour
    this.write({ ...s, until: Date.now() + Math.min(MAX_REST_MS, Math.max(asked, backoff)) });
  }

  /** Storage is read every time, so several tabs share one budget. */
  private read(): State {
    let s = this.mem;
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (v && typeof v.day === 'string' && typeof v.n === 'number') {
        const saved: State = { day: v.day, n: v.n, until: typeof v.until === 'number' ? v.until : 0, out: v.out === true };
        s = saved.day === s.day
          ? { day: s.day, n: Math.max(s.n, saved.n), until: Math.max(s.until, saved.until), out: s.out || saved.out }
          : saved.day > s.day ? saved : s;
      }
    } catch { /* storage unavailable */ }
    return s.day === today() ? s : fresh(s.until);
  }

  private write(s: State) {
    this.mem = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
  }
}
