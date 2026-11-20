import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { AppId, OsService } from './os.service';
import { VoiceService } from './voice.service';
import { NARRATION, TOUR, answer } from './kai.brain';
import { CloudService } from './cloud.service';

export interface ChatMsg { from: 'kai' | 'me'; text: string; }

@Injectable({ providedIn: 'root' })
export class KaiService {
  private os = inject(OsService);
  readonly voice = inject(VoiceService);
  readonly cloud = inject(CloudService);
  /** waiting for Gemini */
  readonly thinking = signal(false);

  constructor() {
    // keep the wake word paused while ALPHA speaks or listens for a question
    effect(() => {
      const busy = this.voice.speaking() || this.voice.listening() || this.thinking() || (this.tourStep() >= 0 && !this.tourPaused());
      untracked(() => this.voice.holdWake(busy));
    });
    // turn it back on automatically if it was on last time and mic access was already granted
    if (this.voice.wakeSaved() && this.voice.canListen) {
      navigator.permissions?.query({ name: 'microphone' as PermissionName })
        .then(p => { if (p.state === 'granted') this.voice.enableWake(rest => this.onWake(rest)); })
        .catch(() => { /* permissions API unavailable — wait for the toggle */ });
    }
  }

  /** "Alpha" toggle (button in chat + menu bar, Spotlight action). */
  toggleWake() {
    if (this.voice.wakeOn()) { this.voice.disableWake(); this.os.notify('"Alpha" is off'); return; }
    if (!this.voice.canListen) { this.os.notify('"Alpha" needs Chrome, Edge or Safari'); return; }
    this.voice.wakeBlocked.set(false);
    this.voice.enableWake(rest => this.onWake(rest));
    this.os.notify('Just say "Alpha" any time 👂');
  }

  /** ALPHA heard its name: wake up, then take the question (said in the same breath, or next). */
  private async onWake(rest: string) {
    this.os.react('wow', 1200);
    this.chatOpen.set(true);
    try {
      if (rest.length > 2) await this.ask(rest);
      else {
        await this.say("Yes? I'm listening.");
        await this.listenAndAsk();
      }
    } finally {
      this.voice.holdWake(false);
    }
  }
  readonly chatOpen = signal(false);
  readonly msgs = signal<ChatMsg[]>([{ from: 'kai', text: "Hi, I'm Alpha, I'm here to assist you. Ask me anything about Kishore — type, or tap the mic and ask out loud." }]);
  /** -1 when no tour is running */
  readonly tourStep = signal(-1);
  readonly tourPaused = signal(false);
  readonly tourTotal = TOUR.length;
  private tourRun = 0;

  /** Speak a line (captions show even when the voice is muted). */
  say(text: string) {
    return this.voice.say(text);
  }

  /** "Explain this window" button. */
  explain(id: AppId, text = NARRATION[id]) {
    this.stopTour();
    this.say(text);
  }

  async ask(q: string) {
    const text = q.trim();
    if (!text || this.thinking()) return;
    this.msgs.update(m => [...m, { from: 'me', text }]);
    const r = answer(text);
    if (r.tour) { this.msgs.update(m => [...m, { from: 'kai', text: r.text }]); this.tour(); return; }
    // navigation intents (open an app, copy email, open a chapter) still run locally and instantly
    if (r.copy) this.os.copy(r.copy, 'Email');
    if (r.open) this.os.open(r.open);
    if (r.link) window.open(r.link, '_blank', 'noopener');
    let reply = r.text;
    if (this.cloud.enabled) {
      this.thinking.set(true);
      const ai = await this.cloud.ask(text);
      this.thinking.set(false);
      if (ai) reply = ai;
    }
    if (reply.startsWith('I only know')) this.os.react('sad', 2400);
    this.msgs.update(m => [...m, { from: 'kai', text: reply }]);
    await this.say(reply);
  }

  async listenAndAsk() {
    if (this.voice.listening()) { this.voice.stopListening(); return; }
    const heard = await this.voice.listen();
    if (heard) await this.ask(heard);
    else this.os.react('sad', 2200), this.os.notify(this.voice.canListen ? "Didn't catch that — try again" : 'Voice input needs Chrome, Edge or Safari');
  }

  /** Guided tour: open each app in turn and narrate it. */
  async tour(from = 0) {
    const run = ++this.tourRun;
    this.chatOpen.set(false);
    this.tourPaused.set(false);
    for (let i = from; i < TOUR.length; i++) {
      if (run !== this.tourRun) return;
      this.tourStep.set(i);
      const step = TOUR[i];
      if (step.app) {
        // keep the desktop tidy: only the app being narrated stays open
        this.os.wins().filter(w => w.id !== step.app).forEach(w => this.os.minimize(w.id));
        this.os.open(step.app);
      }
      await this.say(step.text);
      if (run !== this.tourRun) return;
      await new Promise(r => setTimeout(r, 450));
    }
    if (run === this.tourRun) { this.tourStep.set(-1); this.os.react('wow', 2200); }
  }
  pauseTour() {
    if (this.tourStep() < 0) return;
    if (this.tourPaused()) { this.tourPaused.set(false); this.tour(this.tourStep()); }
    else { this.tourPaused.set(true); this.tourRun++; this.voice.stop(); }
  }
  skipTour() {
    const next = this.tourStep() + 1;
    if (next >= TOUR.length) this.stopTour();
    else this.tour(next);
  }
  stopTour() {
    this.tourRun++;
    this.tourStep.set(-1);
    this.tourPaused.set(false);
    this.voice.stop();
  }
}
