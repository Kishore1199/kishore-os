import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import qrcode from 'qrcode-generator';
import { Icon } from '../core/icon';
import { OsService } from '../core/os.service';
import { prefersReducedMotion } from '../core/theme.service';
import { EXPERIENCE, PROFILE } from '../data/portfolio.data';

const SITE = 'https://kishore-os.web.app';
const [LAST, FIRST] = [PROFILE.name.replace(PROFILE.firstName, '').trim(), PROFILE.firstName];
const [CITY, STATE, COUNTRY] = PROFILE.location.split(',').map(s => s.trim());
const PHONE = PROFILE.phone.replace(/\s+/g, '');

/** A standard vCard, so phones offer "Add to contacts" when the QR code is scanned or the file opened. */
const VCARD = [
  'BEGIN:VCARD', 'VERSION:3.0',
  `N:${LAST};${FIRST};;;`, `FN:${PROFILE.name}`,
  `TITLE:${PROFILE.role}`, `ORG:${PROFILE.company}`,
  `TEL;TYPE=CELL:${PHONE}`, `EMAIL;TYPE=INTERNET:${PROFILE.email}`,
  `ADR;TYPE=WORK:;;;${CITY};${STATE};;${COUNTRY}`,
  `URL:${SITE}`, `X-SOCIALPROFILE;TYPE=linkedin:${PROFILE.linkedin}`, `X-SOCIALPROFILE;TYPE=github:${PROFILE.github}`,
  'END:VCARD',
].join('\r\n');

/** The QR code as one SVG path: a 1×1 square for every dark module. */
function qrPath(text: string) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { d, n };
}

/** Kishore's digital business card: flip it for a QR code that saves his contact in one scan. */
@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="stage" (pointermove)="tilt($event)" (pointerleave)="rest()">
      <div class="card" [class.flipped]="flipped()" [style.--rx.deg]="rx()" [style.--ry.deg]="ry()" [style.--gx.%]="gx()" [style.--gy.%]="gy()"
           role="button" tabindex="0" [attr.aria-pressed]="flipped()" [attr.aria-label]="flipped() ? 'Card back with QR code. Press to show the front.' : 'Business card. Press to show the QR code.'"
           (click)="flip()" (keydown.enter)="flip()" (keydown.space)="$event.preventDefault(); flip()">

        <section class="face front" [attr.aria-hidden]="flipped()">
          <div class="glare"></div>
          <header>
            <span class="mark mono">&lt;KV/&gt;</span>
            <span class="open mono"><i></i> Open to work</span>
          </header>
          <div class="who">
            <h2>{{ p.name }}</h2>
            <p class="role">{{ p.role }}</p>
            <p class="org">{{ job.role }} · {{ p.company }}</p>
          </div>
          <ul class="rows">
            <li><app-icon name="mail" [size]="13" /> {{ p.email }}</li>
            <li><app-icon name="phone" [size]="13" /> {{ p.phone }}</li>
            <li><app-icon name="linkedin" [size]="13" /> in/{{ p.linkedinUser }}</li>
            <li><app-icon name="pin" [size]="13" /> {{ city }}, {{ country }}</li>
          </ul>
          <footer class="mono"><span>Java 21 · Spring Boot · Angular · Microservices</span><span class="hint">tap to flip ↻</span></footer>
        </section>

        <section class="face back" [attr.aria-hidden]="!flipped()">
          <div class="glare"></div>
          <div class="qr">
            <svg [attr.viewBox]="'-2 -2 ' + (qr.n + 4) + ' ' + (qr.n + 4)" shape-rendering="crispEdges" role="img" aria-label="QR code with Kishore's contact details">
              <rect x="-2" y="-2" [attr.width]="qr.n + 4" [attr.height]="qr.n + 4" fill="#fff" />
              <path [attr.d]="qr.d" fill="#0b0b14" />
            </svg>
          </div>
          <div class="scan">
            <b>Scan to save my contact</b>
            <p>Point your phone camera here. It adds {{ p.firstName }} to your contacts with phone, email, LinkedIn and GitHub.</p>
            <p class="mono url">kishore-os.web.app</p>
          </div>
        </section>
      </div>
    </div>

    <div class="actions">
      <button type="button" class="btn hot" (click)="saveContact()"><app-icon name="download" [size]="14" /> Save contact (.vcf)</button>
      <button type="button" class="btn" (click)="flip()"><app-icon name="refresh" [size]="14" /> {{ flipped() ? 'Show front' : 'Show QR code' }}</button>
      <button type="button" class="btn" (click)="share()"><app-icon name="send" [size]="14" /> Share</button>
      <a class="btn" [href]="'mailto:' + p.email + '?subject=' + subject"><app-icon name="mail" [size]="14" /> Email</a>
    </div>
  `,
  styles: `
    :host { display: grid; align-content: start; gap: 22px; padding: 26px 24px 30px; }
    .stage { perspective: 1400px; display: grid; place-items: center; padding: 6px 0; }
    .card { position: relative; width: min(100%, 520px); aspect-ratio: 1.75; border-radius: 22px; cursor: pointer; outline: none; transform-style: preserve-3d;
      transform: rotateX(var(--rx, 0deg)) rotateY(calc(var(--ry, 0deg) + var(--flip, 0deg))); transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1); }
    .card.flipped { --flip: 180deg; }
    .card:focus-visible { box-shadow: 0 0 0 3px var(--accent); }
    .face { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; backface-visibility: hidden; padding: clamp(16px, 4.2%, 26px); color: #f4f5ff;
      box-shadow: 0 30px 60px -24px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.1); }
    .front { display: grid; grid-template-rows: auto 1fr auto auto; gap: 8px;
      background: radial-gradient(120% 140% at 100% 0%, rgba(249, 115, 22, 0.35), transparent 55%), radial-gradient(90% 120% at 0% 100%, rgba(124, 58, 237, 0.45), transparent 60%), linear-gradient(135deg, #15132b, #0b0b16); }
    .back { transform: rotateY(180deg); display: grid; grid-template-columns: auto 1fr; gap: clamp(14px, 4%, 26px); align-items: center;
      background: radial-gradient(100% 120% at 0% 0%, rgba(124, 58, 237, 0.4), transparent 60%), linear-gradient(135deg, #0b0b16, #1b1636); }
    .glare { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at var(--gx, 30%) var(--gy, 20%), rgba(255, 255, 255, 0.16), transparent 45%); }
    header { display: flex; justify-content: space-between; align-items: center; }
    .mark { font-weight: 700; font-size: 0.95rem; color: #ffb37a; letter-spacing: 0.04em; }
    .open { display: inline-flex; align-items: center; gap: 6px; font-size: 0.66rem; padding: 4px 9px; border-radius: 999px; color: #5eead4; border: 1px solid rgba(94, 234, 212, 0.35); }
    .open i { width: 6px; height: 6px; border-radius: 50%; background: #5eead4; box-shadow: 0 0 8px #5eead4; }
    .who { align-self: center; }
    h2 { margin: 0; font: 800 clamp(1.5rem, 5.4vw, 2.25rem) / 1.05 var(--display); letter-spacing: -0.02em; color: #fff; }
    .role { margin: 6px 0 2px; font-weight: 600; color: #ffb37a; font-size: clamp(0.85rem, 2.4vw, 1rem); }
    .org { margin: 0; font-size: 0.78rem; color: rgba(244, 245, 255, 0.65); }
    .rows { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 5px 14px; font-size: clamp(0.66rem, 1.8vw, 0.76rem); color: rgba(244, 245, 255, 0.85); }
    .rows li { display: flex; align-items: center; gap: 6px; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    footer { display: flex; justify-content: space-between; gap: 10px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 0.62rem; color: rgba(244, 245, 255, 0.5); }
    .hint { flex-shrink: 0; }
    .qr { height: 100%; aspect-ratio: 1; max-height: 210px; padding: 8px; border-radius: 14px; background: #fff; box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6); }
    .qr svg { display: block; width: 100%; height: 100%; }
    .scan b { font: 700 clamp(1rem, 3vw, 1.25rem) var(--display); color: #fff; }
    .scan p { margin: 8px 0 0; font-size: clamp(0.7rem, 1.9vw, 0.82rem); line-height: 1.5; color: rgba(244, 245, 255, 0.7); }
    .scan .url { color: #ffb37a; font-size: 0.74rem; }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
    .actions .btn { padding: 9px 14px; font-size: 0.84rem; }
    @media (max-width: 560px) { .rows { grid-template-columns: 1fr; } .rows li:nth-child(n + 3) { display: none; } footer span:first-child { display: none; } footer { justify-content: flex-end; } }
    @media (max-width: 760px) { :host { padding: 18px 14px 190px; } }
    @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
  `,
})
export class Card {
  private os = inject(OsService);
  protected readonly p = PROFILE;
  protected readonly job = EXPERIENCE[0];
  protected readonly city = CITY;
  protected readonly country = COUNTRY;
  protected readonly qr = qrPath(VCARD);
  protected readonly subject = encodeURIComponent('Hello Kishore');
  protected readonly flipped = signal(false);
  protected readonly rx = signal(0);
  protected readonly ry = signal(0);
  protected readonly gx = signal(30);
  protected readonly gy = signal(20);
  private still = prefersReducedMotion();

  protected flip() { this.flipped.update(v => !v); }

  /** the card leans toward the pointer, and the light follows it */
  protected tilt(e: PointerEvent) {
    if (this.still || e.pointerType !== 'mouse') return;
    const card = (e.currentTarget as HTMLElement).firstElementChild as HTMLElement, b = card.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), y = Math.min(1, Math.max(0, (e.clientY - b.top) / b.height));
    this.ry.set((x - 0.5) * 16); this.rx.set((0.5 - y) * 12);
    this.gx.set(this.flipped() ? 100 - x * 100 : x * 100); this.gy.set(y * 100);
  }
  protected rest() { this.rx.set(0); this.ry.set(0); }

  protected saveContact() {
    const url = URL.createObjectURL(new Blob([VCARD], { type: 'text/vcard' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'Kishore_V.vcf' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.os.notify('Contact card downloaded');
  }

  protected async share() {
    const data = { title: `${PROFILE.name} · ${PROFILE.role}`, text: `${PROFILE.name}, ${PROFILE.role} at ${PROFILE.company}.`, url: SITE };
    if (navigator.share) { try { await navigator.share(data); return; } catch { return; /* cancelled */ } }
    this.os.copy(SITE, 'Portfolio link');
  }
}
