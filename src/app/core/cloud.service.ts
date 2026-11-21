import { Injectable, signal } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore, Unsubscribe } from 'firebase/firestore';
import type { Content, GenerativeModel } from 'firebase/ai';
import { FIREBASE_CONFIG, GEMINI_MODEL, RECAPTCHA_ENTERPRISE_KEY, firebaseReady } from './firebase.config';
import { ABOUT_HIGHLIGHTS, EDUCATION, EXPERIENCE, PROFILE, PROJECTS, SKILL_CATEGORIES } from '../data/portfolio.data';
import { STUDY_GUIDES } from '../data/study.data';

export interface GuestNote { id: string; name: string; message: string; color: string; at: Date | null; }

/** Everything Gemini is allowed to know: the portfolio data, nothing else. */
function knowledge(): string {
  const exp = EXPERIENCE.map(e => `- ${e.role} at ${e.company} (${e.period}, ${e.duration}). ${e.summary} Projects: ${e.projects.join(', ')}. Tech: ${e.tech.join(', ')}.`).join('\n');
  const proj = PROJECTS.map(p => `- ${p.title} (${p.org}, ${p.period}${p.link ? ', ' + p.link : ''}): ${p.features.join('; ')}. Tech: ${p.tech.join(', ')}.`).join('\n');
  const skills = SKILL_CATEGORIES.map(c => `- ${c.name}: ${c.skills.map(s => s.name).join(', ')}`).join('\n');
  const edu = EDUCATION.map(e => `- ${e.degree}, ${e.institution} (${e.period}), ${e.grade}`).join('\n');
  const notes = STUDY_GUIDES.map(g => `- ${g.title}: ${g.topics.map(t => t.title).join(', ')}`).join('\n');
  return `PROFILE: ${PROFILE.name}, ${PROFILE.role}, ${PROFILE.location}. 3+ years of experience. Email ${PROFILE.email}, phone ${PROFILE.phone}, LinkedIn ${PROFILE.linkedin}, GitHub ${PROFILE.github}. Open to Java full-stack roles and freelance work.
STRENGTHS: ${ABOUT_HIGHLIGHTS.map(h => `${h.title} — ${h.desc}`).join(' | ')}
EXPERIENCE:
${exp}
PROJECTS:
${proj}
SKILLS:
${skills}
EDUCATION:
${edu}
INTERVIEW-PREP NOTES ON THIS SITE (chapter titles):
${notes}
THIS SITE: "Kishore.OS", a portfolio built as a browser operating system with Angular 22, three.js, the Web Speech API and Firebase. Apps: About Me, Projects, Experience, Skills, Study Notes, Terminal, Contact, Arcade, System Monitor, Guestbook, Resume.`;
}

const SYSTEM = `You are ALPHA, the friendly voice assistant inside Kishore V's portfolio website. You introduce yourself as "Alpha, here to assist you".
Answer ONLY using the facts below about Kishore and this site. If something is not in the facts, say you don't know and suggest contacting Kishore by email. Never invent companies, numbers, dates or skills.
Your answers are read aloud by a speech engine, so: 2–4 short sentences, warm and conversational, no markdown, no bullet points, no emojis, no URLs unless asked.
If the visitor asks about something unrelated to Kishore or the site, politely steer back.

FACTS:
${knowledge()}`;

/**
 * Lazy Firebase connection: nothing is downloaded until ALPHA or the Guestbook actually needs it.
 * Gemini (Firebase AI Logic) answers questions; Firestore stores guestbook notes.
 */
@Injectable({ providedIn: 'root' })
export class CloudService {
  readonly enabled = firebaseReady();
  readonly aiOnline = signal(false);
  private app?: Promise<FirebaseApp>;
  private model?: Promise<GenerativeModel>;
  private db?: Promise<Firestore>;
  private history: { role: 'user' | 'model'; text: string }[] = [];

  private getApp(): Promise<FirebaseApp> {
    this.app ??= (async () => {
      const { initializeApp } = await import('firebase/app');
      const app = initializeApp(FIREBASE_CONFIG);
      if (RECAPTCHA_ENTERPRISE_KEY) {
        const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
        // on localhost, use a debug token (printed in the console) instead of reCAPTCHA
        if (location.hostname === 'localhost') (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_KEY), isTokenAutoRefreshEnabled: true });
      }
      return app;
    })();
    return this.app;
  }

  /** Ask Gemini. Returns null on any failure so callers can fall back to the offline brain. */
  async ask(question: string, signal?: AbortSignal): Promise<string | null> {
    if (!this.enabled) return null;
    try {
      this.model ??= (async () => {
        const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai');
        const ai = getAI(await this.getApp(), { backend: new GoogleAIBackend() });
        return getGenerativeModel(ai, { model: GEMINI_MODEL, systemInstruction: SYSTEM, generationConfig: { maxOutputTokens: 220, temperature: 0.6 } }, { timeout: 8000 }); // don't keep visitors waiting — fall back to offline answers after 8 s
      })();
      const model = await this.model;
      // keep the last few turns so follow-up questions make sense
      const turns: Content[] = this.history.slice(-6).map(h => ({ role: h.role, parts: [{ type: 'text' as const, text: h.text }] }));
      if (signal?.aborted) return null;
      const res = await model.generateContent({ contents: [...turns, { role: 'user', parts: [{ type: 'text' as const, text: question }] }] }, { signal });
      if (signal?.aborted) return null;
      const text = res.response.text().replace(/[*_#`>]/g, '').trim();
      if (!text) return null;
      this.history.push({ role: 'user', text: question }, { role: 'model', text });
      this.aiOnline.set(true);
      return text;
    } catch (e) {
      if (signal?.aborted) return null; // stopped by the visitor — not an outage
      console.warn('[ALPHA] Gemini unavailable, using offline answers', e);
      this.aiOnline.set(false);
      return null;
    }
  }

  private getDb(): Promise<Firestore> {
    this.db ??= (async () => {
      const { getFirestore } = await import('firebase/firestore');
      return getFirestore(await this.getApp());
    })();
    return this.db;
  }

  /** Live list of the newest guestbook notes. Returns an unsubscribe function. */
  async watchGuestbook(cb: (notes: GuestNote[]) => void, onError: (msg: string) => void): Promise<Unsubscribe> {
    const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');
    const q = query(collection(await this.getDb(), 'guestbook'), orderBy('createdAt', 'desc'), limit(60));
    return onSnapshot(q,
      snap => cb(snap.docs.map(d => {
        const v = d.data();
        return { id: d.id, name: String(v['name'] ?? ''), message: String(v['message'] ?? ''), color: String(v['color'] ?? '#fde68a'), at: v['createdAt']?.toDate?.() ?? null };
      })),
      err => onError(err.message));
  }

  async addNote(name: string, message: string, color: string) {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    await addDoc(collection(await this.getDb(), 'guestbook'), { name, message, color, createdAt: serverTimestamp() });
  }
}
