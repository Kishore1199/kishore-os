import { Injectable, signal } from '@angular/core';

type Rec = { lang: string; interimResults: boolean; maxAlternatives: number; start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null; };

const PREF_KEY = 'kv-voice';
const WAKE_KEY = 'kv-wake';
/** "hey alpha" plus the ways speech engines tend to mishear it */
const WAKE = /\b(?:hey|hi|hello|ok|okay|a)[\s,]*(?:alpha|alfa|elfa|alpa|alpah|al pha|elpha)\b/i;

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
  /** user switched the "Hey Alpha" wake word on */
  readonly wakeOn = signal(false);
  /** the background recognizer is running right now (mic is open) */
  readonly wakeLive = signal(false);
  /** the wake word was just heard and we're waiting for the sentence to finish */
  readonly wakeHeard = signal(false);
  private wakeRec?: Rec & { continuous: boolean };
  private wakeCb?: (rest: string) => void;
  private wakeHold = false;
  private token = 0;

  constructor() {
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => (document.hidden ? this.stopWakeRec() : this.startWake()));
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
    this.stopWakeRec(); // don't let the mic hear ALPHA say its own name
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
    this.stopWakeRec(); // only one recognizer can use the mic
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

  // ───────── "Hey Alpha" wake word ─────────

  /** was the wake word left on last visit? (only auto-starts if mic permission is already granted) */
  wakeSaved() {
    try { return localStorage.getItem(WAKE_KEY) === '1'; } catch { return false; }
  }

  /** Start listening in the background for "hey alpha". `cb` gets whatever was said after it. */
  enableWake(cb: (rest: string) => void) {
    if (!this.canListen) return false;
    this.wakeCb = cb;
    this.wakeOn.set(true);
    try { localStorage.setItem(WAKE_KEY, '1'); } catch { /* ignore */ }
    this.startWake();
    return true;
  }

  disableWake() {
    this.wakeOn.set(false);
    try { localStorage.setItem(WAKE_KEY, '0'); } catch { /* ignore */ }
    this.stopWakeRec();
  }

  /** pause the wake word while ALPHA talks or takes a question */
  holdWake(hold: boolean) {
    this.wakeHold = hold;
    if (hold) this.stopWakeRec();
    else this.startWake();
  }

  private startWake() {
    if (!this.wakeOn() || this.wakeHold || this.wakeRec || this.speaking() || this.listening() || document.hidden) return;
    const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!R) return;
    const rec = new R() as Rec & { continuous: boolean };
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-IN';
    rec.maxAlternatives = 1;
    let fired = false;
    rec.onresult = e => {
      const last = e.results[e.results.length - 1];
      const txt = last[0].transcript;
      const m = txt.match(WAKE);
      if (!m) return;
      this.wakeHeard.set(true);
      if (!last.isFinal || fired) return;
      fired = true;
      const rest = txt.slice((m.index ?? 0) + m[0].length).replace(/^[\s,.!?]+/, '').trim();
      this.wakeHold = true; // the handler releases it when the conversation is over
      this.stopWakeRec();
      this.wakeHeard.set(false);
      this.wakeCb?.(rest);
    };
    rec.onerror = ev => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') { this.disableWake(); this.wakeBlocked.set(true); }
    };
    rec.onend = () => {
      if (this.wakeRec === rec) { this.wakeRec = undefined; this.wakeLive.set(false); }
      this.wakeHeard.set(false);
      // Chrome ends continuous recognition after silence — quietly start again
      if (this.wakeOn() && !this.wakeHold) setTimeout(() => this.startWake(), 350);
    };
    try { rec.start(); this.wakeRec = rec; this.wakeLive.set(true); } catch { /* already running */ }
  }

  private stopWakeRec() {
    const r = this.wakeRec;
    this.wakeRec = undefined;
    this.wakeLive.set(false);
    try { r?.abort(); } catch { /* ignore */ }
  }

  /** set when the browser refused microphone access */
  readonly wakeBlocked = signal(false);
}
