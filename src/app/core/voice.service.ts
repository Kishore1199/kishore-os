import { Injectable, signal } from '@angular/core';

type Rec = { lang: string; interimResults: boolean; maxAlternatives: number; start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null; };

const PREF_KEY = 'kv-voice';

/**
 * ALPHA's voice, built on the Web Speech API (no server, no API key):
 *  - speechSynthesis speaks text, with word-boundary events driving live captions and a "level" for the orb
 *  - SpeechRecognition (Chrome / Edge / Safari) turns the visitor's speech into a question
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  readonly canSpeak = typeof speechSynthesis !== 'undefined';
  readonly canListen = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  readonly enabled = signal(this.load());
  readonly speaking = signal(false);
  readonly listening = signal(false);
  readonly caption = signal('');
  /** index of the character where the word currently being spoken starts */
  readonly charAt = signal(-1);
  /** 0…1 loudness envelope — bumps on every spoken word and decays, so visuals can "talk" */
  readonly level = signal(0);
  readonly interim = signal('');
  readonly voiceName = signal('');
  private voice: SpeechSynthesisVoice | null = null;
  private raf = 0;
  private target = 0;
  private fallbackT?: ReturnType<typeof setInterval>;
  private rec?: Rec;
  private token = 0;

  constructor() {
    if (!this.canSpeak) return;
    const pick = () => {
      const vs = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
      const rank = (v: SpeechSynthesisVoice) =>
        (/natural|neural|online/i.test(v.name) ? 40 : 0) + (/google/i.test(v.name) ? 20 : 0) + (v.lang === 'en-IN' ? 12 : v.lang === 'en-GB' ? 8 : v.lang === 'en-US' ? 6 : 0) + (/male|guy|ryan|prabhat|daniel/i.test(v.name) ? 3 : 0);
      this.voice = vs.sort((a, b) => rank(b) - rank(a))[0] ?? null;
      this.voiceName.set(this.voice?.name ?? '');
    };
    pick();
    speechSynthesis.addEventListener?.('voiceschanged', pick);
  }

  toggle() {
    this.enabled.update(v => !v);
    try { localStorage.setItem(PREF_KEY, this.enabled() ? '1' : '0'); } catch { /* ignore */ }
    if (!this.enabled()) this.stop();
  }

  /**
   * Speak (or, when muted/unsupported, just caption) a piece of text. Resolves when finished or interrupted.
   * Captions advance word by word either from real boundary events or from a timed fallback.
   */
  say(text: string): Promise<void> {
    this.stop();
    const my = ++this.token;
    this.caption.set(text);
    this.charAt.set(0);
    this.speaking.set(true);
    this.animate();
    return new Promise<void>(resolve => {
      const done = () => {
        if (my !== this.token) return resolve();
        clearInterval(this.fallbackT);
        this.speaking.set(false);
        this.charAt.set(text.length);
        this.target = 0;
        resolve();
      };
      if (this.enabled() && this.canSpeak) {
        const u = new SpeechSynthesisUtterance(text.replace(/·/g, ',').replace(/–/g, ' to '));
        if (this.voice) u.voice = this.voice;
        u.lang = this.voice?.lang ?? 'en-IN';
        u.rate = 1.03;
        u.pitch = 1;
        let gotBoundary = false;
        u.onboundary = e => {
          if (e.name !== 'word' && e.name !== undefined) return;
          gotBoundary = true;
          this.charAt.set(e.charIndex);
          this.target = 0.6 + Math.random() * 0.4;
        };
        u.onend = done;
        u.onerror = done;
        speechSynthesis.speak(u);
        // some voices never fire boundary events — fall back to a timed caption after a moment
        setTimeout(() => { if (!gotBoundary && my === this.token && this.speaking()) this.timed(text, my, null); }, 900);
        // Chrome stops long utterances after ~15 s unless nudged
        const keep = setInterval(() => { if (my !== this.token || !this.speaking()) return clearInterval(keep); speechSynthesis.pause(); speechSynthesis.resume(); }, 10000);
      } else {
        this.timed(text, my, done);
      }
    });
  }

  /** Advance captions at ~2.7 words/second. If `done` is given, this also ends the utterance. */
  private timed(text: string, my: number, done: (() => void) | null) {
    const starts = [...text.matchAll(/\S+/g)].map(m => m.index ?? 0);
    let i = 0;
    clearInterval(this.fallbackT);
    this.fallbackT = setInterval(() => {
      if (my !== this.token) return clearInterval(this.fallbackT);
      if (i >= starts.length) { clearInterval(this.fallbackT); done?.(); return; }
      this.charAt.set(starts[i++]);
      this.target = 0.5 + Math.random() * 0.5;
    }, 370);
  }

  stop() {
    this.token++;
    clearInterval(this.fallbackT);
    if (this.canSpeak) speechSynthesis.cancel();
    this.speaking.set(false);
    this.target = 0;
  }

  /** Listen once; resolves with the final transcript ('' if nothing was heard). */
  listen(): Promise<string> {
    const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!R) return Promise.resolve('');
    this.stop();
    this.rec?.abort();
    const rec: Rec = new R();
    this.rec = rec;
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    this.interim.set('');
    this.listening.set(true);
    return new Promise(resolve => {
      let final = '';
      rec.onresult = e => {
        let txt = '';
        for (let i = 0; i < e.results.length; i++) {
          txt += e.results[i][0].transcript;
          if (e.results[i].isFinal) final = txt;
        }
        this.interim.set(txt);
        this.target = 0.4;
      };
      rec.onerror = () => { this.listening.set(false); resolve(''); };
      rec.onend = () => { this.listening.set(false); resolve((final || this.interim()).trim()); };
      try { rec.start(); this.animate(); } catch { this.listening.set(false); resolve(''); }
    });
  }
  stopListening() {
    this.rec?.stop();
  }

  private animate() {
    if (this.raf) return;
    const tick = () => {
      const l = this.level();
      const next = l + (this.target - l) * 0.25;
      this.target *= 0.9; // each word "pulse" fades
      this.level.set(next < 0.005 ? 0 : next);
      if (this.speaking() || this.listening() || next > 0.005) this.raf = requestAnimationFrame(tick);
      else this.raf = 0;
    };
    this.raf = requestAnimationFrame(tick);
  }

  private load() {
    try { return localStorage.getItem(PREF_KEY) !== '0'; } catch { return true; }
  }
}
