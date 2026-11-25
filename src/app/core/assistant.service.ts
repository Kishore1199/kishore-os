import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { SectionId as AppId, AssistantBus as OsService } from './assistant.bus';
import { VoiceService } from './voice.service';
import { NARRATION, Reply, TOUR, TourStep, answer, noteAllowed, quickReply } from './assistant.brain';
import { AgentService } from './agent.service';
import { AgentLink, AgentStep } from './agent.tools';
import { CloudService } from './cloud.service';
import { DeviceAi } from './device-ai.service';
import { portfolioFacts } from './facts';
import { GithubService } from './github.service';
import { Dialogue, moodFor } from './dialogue';
import { looksLikeJob } from './looks-like-job';
import { PageCmd, pageCommand } from './page-commands';
import { NotificationService } from './notification.service';
import { OsService as Desktop } from './os.service';
import { PetService } from './pet.service';
import { SessionService } from './session.service';
import { WallpaperService } from './wallpaper.service';
import { WinCmd, windowCommand } from './window-commands';
import { ThemeService, prefersReducedMotion } from './theme.service';
import { SavedStore } from '../lab/saved.store';
import { FeedbackService } from './feedback.service';
import { LanguageService } from './language.service';
import { TraceStore } from './trace.store';
import { NotesService } from './notes.service';
import { VisitorMemory } from './visitor-memory.service';

/** The on-device model is small and has no tools, so it gets fewer facts and simpler rules. */
const DEVICE_SYSTEM = () => `You are ALPHA, the assistant on Kishore V's portfolio. Answer only from the facts below and any STUDY NOTES given with the question, in 2 to 4 short spoken sentences without markdown. If the facts don't say, say you don't know. You can't click, open, send or look anything up.

FACTS:
${portfolioFacts(true)}`;

const CHAT_KEY = 'kv-chat';
interface Offline { steps: AgentStep[]; links: AgentLink[]; acted: boolean; }
export interface ChatMsg { from: 'kai' | 'me'; text: string; steps?: AgentStep[]; links?: AgentLink[]; /** written by AI, for this question */ q?: string; vote?: 'up' | 'down'; /** quick replies */ chips?: string[]; }

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private os = inject(OsService);
  private desktop = inject(Desktop);
  private pet = inject(PetService);
  private session = inject(SessionService);
  private paper = inject(WallpaperService);
  private notifications = inject(NotificationService);
  readonly voice = inject(VoiceService);
  readonly cloud = inject(CloudService);
  private agent = inject(AgentService);
  readonly device = inject(DeviceAi);
  readonly memory = inject(VisitorMemory);
  private notes = inject(NotesService);
  private github = inject(GithubService);
  private saved = inject(SavedStore);
  readonly lang = inject(LanguageService);
  readonly feedback = inject(FeedbackService);
  private traces = inject(TraceStore);
  private theme = inject(ThemeService);
  private talk = new Dialogue();
  /** what the agent is doing right now (moves into the message when it answers) */
  readonly liveSteps = signal<AgentStep[]>([]);
  /** waiting for Gemini */
  readonly thinking = signal(false);

  constructor() {
    // keep the wake word paused while ALPHA speaks or listens for a question
    effect(() => {
      const busy = this.voice.speaking() || this.voice.listening() || this.thinking() || (this.tourStep() >= 0 && !this.tourPaused());
      untracked(() => this.voice.holdWake(busy));
    });
    // Gemini is unavailable: see whether this browser has its own model to offer
    effect(() => { if (!this.cloud.aiOnline()) void this.device.check(); });
    // on a phone the chat would cover the drafted message
    effect(() => { if (this.os.draft() && innerWidth <= 760) untracked(() => this.chatOpen.set(false)); });
    const old = this.loadChat();
    if (old.length) this.msgs.set(old);
    effect(() => { const m = this.msgs(); if (this.memory.on()) untracked(() => this.saveChat(m)); });
    const hello = old.length ? null : this.memory.greeting();
    if (hello) this.msgs.update(m => [...m, { from: 'kai', text: hello }]);
    effect(() => this.voice.listenLang.set(this.lang.info().speech));
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
  /** the standard tour, or one the agent planned for this visitor */
  private readonly tourSteps = signal<TourStep[]>(TOUR);
  readonly tourTotal = computed(() => this.tourSteps().length);
  private tourRun = 0;

  /** Speak a line (captions show even when the voice is muted). */
  say(text: string) {
    return this.voice.say(text);
  }

  /** "Explain this section" button. */
  explain(id: string, text = NARRATION[id as AppId] ?? '') {
    this.stopTour();
    this.say(text);
  }

  /** bumps whenever a question is cancelled or replaced, so late answers are ignored */
  private askRun = 0;
  private askAbort?: AbortController;

  /** Stop button: cancel the pending Gemini request and/or the current speech. */
  cancel(silent = false) {
    if (this.tourStep() >= 0) this.stopTour();
    else if (!this.thinking() && !this.voice.speaking()) return;
    this.askRun++;
    this.askAbort?.abort();
    clearInterval(this.revealT);
    this.reveal.set(null);
    this.thinking.set(false);
    this.voice.stop();
    const steps = this.liveSteps().filter(s => s.state !== 'run');
    this.liveSteps.set([]);
    if (!silent) this.msgs.update(m => [...m, { from: 'kai', text: 'Okay, stopped. Ask me something else.', steps }]);
  }

  async ask(q: string) {
    const said = q.trim();
    let text = said;
    if (!text) return;
    if (looksLikeJob(text)) return this.os.openMatcher(text);
    // a new question replaces whatever ALPHA is thinking, saying or touring
    if (this.thinking() || this.voice.speaking() || this.tourStep() >= 0) this.cancel(true);
    const run = ++this.askRun;
    this.msgs.update(m => [...m, { from: 'me', text: said }]);
    this.memory.learn(text);

    // what does it mean, given what we were talking about? ("tell me more", "yes", "which technology?")
    for (let i = 0; i < 2 && !pageCommand(text) && !windowCommand(text); i++) {
      const f = this.talk.follow(text, this.cloud.canAsk() && i === 0);
      if (f?.reply) return this.replyOffline(f.reply, text, run);
      if (!f?.ask) break;
      text = f.ask;
    }
    let quick = quickReply(text);
    if (quick?.chat && this.lang.lang() !== 'en' && this.cloud.canAsk()) quick = null; // let Gemini chat in the visitor's language
    if (!this.cloud.canAsk()) this.cloud.aiOnline.set(false); // today's share of the free quota is used up, or Gemini is resting
    if (quick) return this.replyOffline(quick, text, run);
    if (!this.cloud.canAsk()) return this.withoutGemini(text, run);

    this.thinking.set(true);
    const ctrl = new AbortController();
    this.askAbort = ctrl;
    const approved = this.lang.lang() === 'en' ? await this.cloud.approvedAnswer(text.toLowerCase().replace(/\s+/g, ' ').replace(/[?!.\s]+$/, '').trim()) : null;
    if (run !== this.askRun) return;
    if (approved) {
      this.thinking.set(false);
      this.post({ from: 'kai', text: approved, steps: [{ icon: 'check', label: 'Answer approved by Kishore', state: 'ok' }], chips: this.talk.after(text, approved).chips });
      await this.say(approved);
      return;
    }
    const res = await this.agent.run(text, ctrl.signal, steps => { if (run === this.askRun) this.liveSteps.set(steps); });
    if (run !== this.askRun) return; // stopped or replaced while waiting
    this.thinking.set(false);
    this.liveSteps.set([]);

    if (!res.text) {
      const steps: AgentStep[] = [...res.steps, { icon: 'cloud', label: 'AI unavailable, using the built-in answer', state: 'fail' }];
      return this.withoutGemini(text, run, { steps, links: res.links, acted: res.acted });
    }
    this.post({ from: 'kai', text: res.text, steps: res.steps, links: res.links, q: text, chips: this.talk.after(text, res.text).chips });
    if (res.tour) {
      const steps = res.tour.steps;
      await new Promise(r => setTimeout(r, 1800)); // let the visitor read the plan before the chat closes
      if (run === this.askRun) this.runTour(steps);
      return;
    }
    await this.say(res.text);
  }

  /** Gemini can't be used: try the on-device model, then the built-in brain. */
  private async withoutGemini(text: string, run: number, after?: Offline) {
    // Gemini would have understood a follow-up; without it the conversation engine does
    const f = after?.acted ? null : this.talk.follow(text, false);
    if (f?.reply) return this.replyOffline(f.reply, text, run, after);
    if (f?.ask) text = f.ask;
    const fixed = answer(text);
    // buttons and navigation work better from the built-in brain than from a model without tools
    const does = fixed.lab || fixed.tour || fixed.match || fixed.interview || fixed.draft || fixed.github || fixed.link || fixed.win;
    if (this.device.state() === 'ready' && !does && !after?.acted) {
      const step: AgentStep = { icon: 'cpu', label: 'Thinking on this device', state: 'run' };
      const ctrl = new AbortController();
      this.askAbort = ctrl;
      this.thinking.set(true);
      this.liveSteps.set([...(after?.steps ?? []), step]);
      let said = '';
      // a question the portfolio facts can't answer: give the model the matching study note
      const quote = await this.noteFor(text, fixed);
      const prompt = `${quote ? `STUDY NOTES: ${quote.text}\n\n` : ''}${text.slice(0, 1000)}`;
      try { said = (await this.device.text(DEVICE_SYSTEM(), prompt, ctrl.signal)).replace(/[*_#`>]/g, '').trim(); }
      catch (e) { if (!ctrl.signal.aborted) console.warn('[ALPHA] on-device AI failed', e); }
      if (run !== this.askRun) return;
      this.thinking.set(false);
      this.liveSteps.set([]);
      if (said) {
        const steps: AgentStep[] = [...(after?.steps ?? []), { ...step, label: 'Answered on this device', state: 'ok' }];
        this.post({ from: 'kai', text: said, steps, links: quote ? [...(after?.links ?? []), { label: quote.chapter, url: quote.url }] : after?.links, q: text, chips: this.talk.after(text, said).chips });
        await this.say(said);
        return;
      }
    }
    await this.replyOffline(fixed, text, run, after);
  }

  /** A matching study note, for technical questions that aren't about Kishore or this site. */
  private async noteFor(question: string, fixed: Reply) {
    if (!noteAllowed(question, fixed)) return null;
    return this.notes.quote(question).catch(() => null);
  }

  /** Answer from the built-in brain. `after` is set when the agent was tried first. */
  private async replyOffline(r: Reply, question: string, run: number, after?: Offline) {
    if (r.github) {
      this.thinking.set(true);
      const g = await this.github.summary();
      if (run !== this.askRun) return;
      this.thinking.set(false);
      r = { text: g.text };
      after = { steps: after?.steps ?? [], links: [...(after?.links ?? []), ...g.links], acted: true };
    } else {
      const quote = await this.noteFor(question, r);
      if (run !== this.askRun) return;
      if (quote) { r = { text: quote.text }; after = { steps: after?.steps ?? [], links: [...(after?.links ?? []), { label: quote.chapter, url: quote.url }], acted: true }; }
    }
    await this.deliver(r, question, after);
  }

  private async deliver(r: Reply, question: string, after?: Offline) {
    const links = [...(after?.links ?? [])];
    const local = this.lang.section(r.open);
    if (local) r = { ...r, text: local };
    if (r.link && !links.some(l => l.url === r.link)) links.push({ label: 'Open', url: r.link });
    // once the agent has acted, don't repeat or contradict what it already did on the page
    const act = !after?.acted;
    let text = r.text.replace(" I've copied the email for you.", '');
    if (r.link && after) text = text.replace(/Opening (it|his resume) in a new tab\./, 'Use the button below to open it.'); // too long since the click: the browser would block a pop-up
    else if (r.link) window.open(r.link, '_blank', 'noopener');
    if (r.url && !links.some(l => l.url === r.url)) links.push({ label: r.label ?? 'Open', url: r.url });
    // a question back keeps the talk going; not after a command or when something opens
    const plain = !(r.tour || r.match || r.interview || r.draft || r.lab || r.page || r.live || r.forget || r.link || r.win);
    const next = plain ? this.talk.after(question, text, r.chat) : { ask: '', chips: [] };
    if (next.ask && this.lang.lang() === 'en') text = `${text} ${next.ask}`;
    this.post({ from: 'kai', text, steps: after?.steps, links, chips: next.chips });
    if (r.page) this.command(r.page);
    if (r.win) { this.window(r.win); if (this.desktop.mobile) setTimeout(() => this.chatOpen.set(false), 900); } // the chat would cover it
    if (r.project) this.os.showProject(r.project);
    if (r.tour && act) { this.runTour(TOUR); return; }
    if (r.match && act) this.os.openMatcher();
    if (r.interview && act) this.os.openInterview();
    if (r.draft && act) { this.chatOpen.set(false); this.os.startDraft(); }
    if (r.lab && act) this.os.openLab(r.lab);
    if (r.forget) this.forget();
    if (r.copy && act) this.os.copy(r.copy, 'Email');
    if (r.open && act) this.os.go(r.open);
    if (r.live) { void this.startLive(); return; }
    if (text.startsWith('I only know')) this.os.react('sad', 2400);
    await this.say(text);
    const mood = r.chat ? moodFor(question) : null;
    if (mood) this.os.react(mood, 2200);
  }

  // ───────── typing out an answer ─────────

  /** how many characters of the newest answer are shown; null when all of it is */
  readonly reveal = signal<number | null>(null);
  private revealT?: ReturnType<typeof setInterval>;

  private post(m: ChatMsg) {
    clearInterval(this.revealT);
    this.msgs.update(ms => [...ms, m]);
    if (prefersReducedMotion() || document.hidden) { this.reveal.set(null); return; }
    this.reveal.set(0);
    this.revealT = setInterval(() => {
      const n = (this.reveal() ?? 0) + 3;
      if (n >= m.text.length) { clearInterval(this.revealT); this.reveal.set(null); } else this.reveal.set(n);
    }, 34);
  }

  // ───────── live talk: hands-free, one turn after the other ─────────

  readonly live = signal(false);
  private liveRun = 0;

  async startLive() {
    if (this.live()) return;
    if (!this.voice.canListen) { this.post({ from: 'kai', text: 'Live talk needs Chrome, Edge or Safari with a microphone. You can still type to me.' }); return; }
    const run = ++this.liveRun;
    const on = () => this.live() && run === this.liveRun;
    this.live.set(true);
    this.chatOpen.set(true);
    if (this.thinking()) this.cancel(true);
    await this.say("I'm listening. Talk to me, and say stop when you are done.");
    let silent = 0;
    while (on()) {
      // wait while a tour runs or a tool is open
      if (this.tourStep() >= 0 || this.os.lab() || this.os.matcher() || this.os.interview() || document.hidden) { await new Promise(r => setTimeout(r, 600)); continue; }
      const began = Date.now();
      const heard = (await this.voice.listen()).trim();
      if (!on()) return;
      if (!heard) {
        silent++;
        if (Date.now() - began < 400 && silent >= 2) return this.stopLive("I can't hear anything. Please allow the microphone and try again.");
        if (silent === 2) await this.say('Are you still there?');
        if (silent >= 4) return this.stopLive("I'll rest now. Start live talk whenever you like.");
        continue;
      }
      silent = 0;
      if (/^(stop|stop (it|now|live talk|listening|talking)|bye|goodbye|good bye|bye bye|exit|end|finish|that's all|thats all|that is all)( alpha)?$/i.test(heard.replace(/[.!?]+$/, ''))) {
        this.msgs.update(m => [...m, { from: 'me', text: heard }]);
        return this.stopLive('Okay, live talk is off. It was nice talking with you!');
      }
      await this.ask(heard);
    }
  }

  stopLive(text = '') {
    if (!this.live()) return;
    this.liveRun++;
    this.live.set(false);
    if (this.voice.listening()) this.voice.stopListening();
    if (text) { this.post({ from: 'kai', text }); void this.say(text); } else this.cancel(true);
  }

  // ───────── commands for the page ─────────

  private command(c: PageCmd) {
    switch (c) {
      case 'down': case 'up': case 'top': case 'bottom': this.desktop.scroll(c); break;
      case 'next-section': this.desktop.cycle(1); break;
      case 'prev-section': this.desktop.cycle(-1); break;
      case 'next-project': case 'prev-project': this.os.slide(c === 'next-project' ? 'next' : 'prev'); void this.os.go('projects'); break;
      case 'pause-slides': this.os.slide('pause'); break;
      case 'play-slides': this.os.slide('play'); break;
      case 'dark': case 'light': this.theme.isDark.set(c === 'dark'); break;
      case 'mute': if (this.voice.enabled()) this.voice.toggle(); break;
      case 'unmute': if (!this.voice.enabled()) this.voice.toggle(); break;
      case 'close-chat': setTimeout(() => this.chatOpen.set(false), 900); break;
    }
  }

  /** Move, open and close windows. */
  private window(c: WinCmd) {
    const front = this.desktop.focused();
    switch (c.do) {
      case 'open': if (c.app) this.desktop.open(c.app); break;
      case 'close': { const id = c.app ?? front; if (id) this.desktop.close(id); break; }
      case 'minimise': { const id = c.app ?? front; if (id && this.desktop.isOpen(id)) this.desktop.minimize(id); break; }
      case 'maximise': { const id = c.app ?? front; if (id) { this.desktop.open(id); if (!this.desktop.wins().find(w => w.id === id)?.max) this.desktop.toggleMax(id); } break; }
      case 'snap': { const id = c.app ?? front; if (!id) break; if (c.app) this.desktop.open(c.app); setTimeout(() => this.desktop.snap(id, c.to), 60); break; }
      case 'side': this.desktop.side(c.app, c.other); break;
      case 'tile': if (!this.desktop.tile()) this.os.notify(this.desktop.mobile ? 'Windows fill the screen on a phone' : 'Open some windows first'); break;
      case 'cascade': if (!this.desktop.cascade()) this.os.notify(this.desktop.mobile ? 'Windows fill the screen on a phone' : 'Open some windows first'); break;
      case 'close-all': this.desktop.closeAll(); break;
      case 'desktop': this.desktop.minimizeAll(); this.chatOpen.set(false); break;
      case 'spotlight': this.desktop.spotlight.set(true); break;
      case 'pet-on': this.chatOpen.set(false); this.pet.set(true); break;
      case 'paper-reset': this.paper.reset(); break;
      case 'pet-off': this.pet.set(false); break;
    }
  }

  /** Thumbs up or down on an AI answer. */
  async rate(m: ChatMsg, up: boolean) {
    const ok = await this.feedback.vote(up, 'chat', m.q ?? '', m.text);
    if (ok) this.msgs.update(ms => ms.map(x => (x === m ? { ...x, vote: up ? 'up' : 'down' } : x)));
    else this.os.notify('Your rating could not be sent');
  }

  /** The chat survives a reload, in this tab only. */
  private saveChat(m: ChatMsg[]) {
    try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(m.slice(-30))); } catch { /* storage unavailable */ }
  }

  private loadChat(): ChatMsg[] {
    if (!this.memory.on()) return [];
    try {
      const v = JSON.parse(sessionStorage.getItem(CHAT_KEY) ?? '[]') as ChatMsg[];
      return (Array.isArray(v) ? v : []).filter(m => (m?.from === 'kai' || m?.from === 'me') && typeof m.text === 'string').map(({ from, text }) => ({ from, text }));
    } catch { return []; }
  }

  /** Forget everything remembered about this visitor, including this conversation's context. */
  forget() {
    this.memory.forget();
    this.cloud.clearHistory();
    this.feedback.forget();
    this.traces.clear();
    this.talk.reset();
    this.session.forget();
    this.paper.forget();
    this.notifications.clear();
    try { localStorage.removeItem('kv-daily'); } catch { /* storage unavailable */ }
    try { sessionStorage.removeItem(CHAT_KEY); } catch { /* storage unavailable */ }
    void this.saved.clear().catch(() => { /* nothing saved, or storage unavailable */ });
  }

  async listenAndAsk() {
    if (this.voice.listening()) { this.voice.stopListening(); return; }
    const heard = await this.voice.listen();
    if (heard) await this.ask(heard);
    else this.os.react('sad', 2200), this.os.notify(this.voice.canListen ? "Didn't catch that — try again" : 'Voice input needs Chrome, Edge or Safari');
  }

  /** Guided tour: open each window in turn and narrate it. */
  tour() {
    if (this.thinking()) this.cancel(true);
    return this.runTour(TOUR);
  }
  /** Replay the current stop (e.g. after unmuting). */
  replayTourStep() {
    return this.runTour(this.tourSteps(), this.tourStep());
  }
  private async runTour(steps: TourStep[], from = 0) {
    const run = ++this.tourRun;
    this.askRun++; // a tour that is about to start from an earlier question is replaced by this one
    this.chatOpen.set(false);
    this.tourSteps.set(steps);
    this.tourPaused.set(false);
    for (let i = from; i < steps.length; i++) {
      if (run !== this.tourRun) return;
      this.tourStep.set(i);
      const step = steps[i];
      if (step.project) this.os.showProject(step.project);
      await this.os.go(step.app); // open the window, then narrate it
      if (run !== this.tourRun) return;
      await this.say(step.text);
      if (run !== this.tourRun) return;
      await new Promise(r => setTimeout(r, 450));
    }
    if (run === this.tourRun) { this.tourStep.set(-1); this.os.react('wow', 2200); }
  }
  pauseTour() {
    if (this.tourStep() < 0) return;
    if (this.tourPaused()) { this.replayTourStep(); }
    else { this.tourPaused.set(true); this.tourRun++; this.voice.stop(); }
  }
  skipTour() {
    const next = this.tourStep() + 1;
    if (next >= this.tourTotal()) this.stopTour();
    else this.runTour(this.tourSteps(), next);
  }
  stopTour() {
    this.tourRun++;
    this.tourStep.set(-1);
    this.tourPaused.set(false);
    this.voice.stop();
  }
}
