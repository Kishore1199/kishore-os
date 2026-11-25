import { Injectable } from '@angular/core';
import { EXPERIENCE, PROFILE } from '../data/portfolio.data';

export interface Repo { name: string; description: string; language: string; pushed: string; url: string; pushes: number; }

const API = `https://api.github.com/users/${PROFILE.githubUser}`;
const FRESH_MS = 10 * 60_000;
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const day = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };

/** API replies are external data: keep only what is needed, and build links from the repo name alone. */
export function parseRepos(repos: unknown, events: unknown): Repo[] {
  const pushes = new Map<string, number>();
  for (const e of Array.isArray(events) ? events : []) if (e?.type === 'PushEvent') pushes.set(String(e.repo?.name), (pushes.get(String(e.repo?.name)) ?? 0) + 1);
  return (Array.isArray(repos) ? repos : [])
    .filter(r => r && !r.fork && !r.archived && !r.private && typeof r.name === 'string' && /^[\w.-]{1,100}$/.test(r.name) && day(r.pushed_at))
    .map(r => ({ name: r.name, description: text(r.description, 160), language: text(r.language, 30), pushed: r.pushed_at as string, url: `${PROFILE.github}/${r.name}`, pushes: pushes.get(`${PROFILE.githubUser}/${r.name}`) ?? 0 }))
    .sort((a, b) => b.pushed.localeCompare(a.pushed))
    .slice(0, 8);
}

/** Kishore's public GitHub activity. GitHub allows 60 free requests an hour per visitor; this uses two. */
@Injectable({ providedIn: 'root' })
export class GithubService {
  private cached?: { at: number; repos: Promise<Repo[]> };

  repos(): Promise<Repo[]> {
    if (!this.cached || Date.now() - this.cached.at > FRESH_MS) {
      const repos = this.load();
      this.cached = { at: Date.now(), repos };
      repos.catch(() => (this.cached = undefined));
    }
    return this.cached.repos;
  }

  /** "What is Kishore working on?" answered without AI. Never throws. */
  async summary(): Promise<{ text: string; links: { label: string; url: string }[] }> {
    const job = EXPERIENCE.find(e => e.current);
    const work = job ? `At ${job.company}, Kishore works on ${job.projects.slice(0, 2).join(' and ')}.` : '';
    const profile = { label: 'GitHub profile', url: PROFILE.github };
    try {
      const [r, ...rest] = await this.repos();
      if (!r) return { text: `${work} I can't see any public repositories right now.`, links: [profile] };
      const latest = `On GitHub, his latest public push was to ${r.name} on ${day(r.pushed)}${r.pushes > 1 ? `, one of ${r.pushes} recent pushes there` : ''}.`;
      const others = rest.length ? ` Other public repositories include ${rest.slice(0, 2).map(x => x.name).join(' and ')}.` : '';
      return { text: `${work} ${latest}${others}`.trim(), links: [{ label: r.name, url: r.url }, profile] };
    } catch {
      return { text: `${work} I couldn't reach GitHub just now.`.trim(), links: [profile] };
    }
  }

  private async load(): Promise<Repo[]> {
    const get = async (path: string) => {
      const r = await fetch(`${API}/${path}`, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`GitHub: HTTP ${r.status}`);
      return r.json();
    };
    const [repos, events] = await Promise.all([get('repos?per_page=100&sort=pushed'), get('events/public?per_page=100').catch(() => [])]);
    return parseRepos(repos, events);
  }
}
