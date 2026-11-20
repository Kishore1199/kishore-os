import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type Mood = 'idle' | 'happy' | 'talk' | 'listen' | 'wink' | 'love' | 'sleep' | 'blink' | 'giggle' | 'dizzy' | 'highfive' | 'shy'
  | 'wow' | 'cool' | 'angry' | 'sad' | 'party' | 'yawn';
export type Zone = 'face' | 'belly' | 'head' | 'hand' | 'ear';

/**
 * ALPHA's body: a pearl-white mini robot with a glass visor face.
 * The face changes with `mood`; the mouth opening follows the inherited CSS variable --lv (voice level 0…1).
 */
@Component({
  selector: 'app-robot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': "'m-' + mood()" },
  template: `
    <svg viewBox="0 0 120 150" aria-hidden="true">
      <defs>
        <linearGradient id="rp-shell" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#ffffff" /><stop offset="0.55" stop-color="#eef0fb" /><stop offset="1" stop-color="#c9cee8" /></linearGradient>
        <linearGradient id="rp-visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1f3f" /><stop offset="1" stop-color="#070918" /></linearGradient>
        <radialGradient id="rp-jet" cx="0.5" cy="0.25" r="0.75"><stop offset="0" stop-color="#fff" /><stop offset="0.35" class="moodstop" /><stop offset="1" class="moodstop" stop-opacity="0" /></radialGradient>
      </defs>

      <ellipse class="jet" cx="60" cy="139" rx="15" ry="9" fill="url(#rp-jet)" />
      <ellipse class="shadow" cx="60" cy="146" rx="22" ry="3" />

      @if (mood() === 'love') {
        <g class="hearts">
          <path class="h h1" d="M18 30l-5-5a3 3 0 0 1 5-3.5a3 3 0 0 1 5 3.5z" />
          <path class="h h2" d="M100 22l-6-6a3.6 3.6 0 0 1 6-4.2a3.6 3.6 0 0 1 6 4.2z" />
          <path class="h h3" d="M86 8l-4-4a2.4 2.4 0 0 1 4-2.8a2.4 2.4 0 0 1 4 2.8z" />
        </g>
      }
      @if (mood() === 'dizzy') {
        <g class="stars"><path class="st s1" d="M60 2l1.6 3.4 3.7.4-2.8 2.5.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.8-2.5 3.7-.4z" /><path class="st s2" d="M60 2l1.6 3.4 3.7.4-2.8 2.5.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.8-2.5 3.7-.4z" /><path class="st s3" d="M60 2l1.6 3.4 3.7.4-2.8 2.5.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.8-2.5 3.7-.4z" /></g>
      }
      @if (mood() === 'highfive') {
        <g class="sparks"><path d="M104 52l6-6M110 62h8M100 46l2-8" /></g>
      }
      @if (mood() === 'giggle') {
        <g class="haha"><text x="92" y="30">ha</text><text x="4" y="40">he</text></g>
      }
      @if (mood() === 'party') {
        <g class="confetti"><rect class="cf c0" x="58" y="20" width="4" height="7" rx="1" /><rect class="cf c1" x="60" y="20" width="4" height="7" rx="1" /><rect class="cf c2" x="62" y="20" width="4" height="7" rx="1" /><rect class="cf c3" x="58" y="20" width="4" height="7" rx="1" /><rect class="cf c4" x="60" y="20" width="4" height="7" rx="1" /><rect class="cf c5" x="62" y="20" width="4" height="7" rx="1" /><rect class="cf c6" x="58" y="20" width="4" height="7" rx="1" /><rect class="cf c7" x="60" y="20" width="4" height="7" rx="1" /><rect class="cf c8" x="62" y="20" width="4" height="7" rx="1" /><rect class="cf c9" x="58" y="20" width="4" height="7" rx="1" /></g>
      }
      @if (mood() === 'angry') {
        <g class="steam"><circle cx="10" cy="22" r="4" /><circle cx="110" cy="22" r="4" /><circle cx="6" cy="14" r="3" /><circle cx="114" cy="14" r="3" /></g>
      }
      @if (mood() === 'wow') {
        <g class="sparkle"><path d="M14 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /><path d="M104 14l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" /></g>
      }
      @if (mood() === 'sleep') {
        <g class="zzz"><text class="z z1" x="88" y="22">Z</text><text class="z z2" x="98" y="12">z</text><text class="z z3" x="106" y="4">z</text></g>
      }
      <g class="float">
        <!-- arms -->
        <g class="arm l"><rect x="17" y="86" width="11" height="27" rx="5.5" fill="url(#rp-shell)" stroke="#b7bddc" stroke-width="1" /><circle cx="22.5" cy="114" r="5" class="mood" /></g>
        <g class="arm r"><rect x="92" y="86" width="11" height="27" rx="5.5" fill="url(#rp-shell)" stroke="#b7bddc" stroke-width="1" /><circle cx="97.5" cy="114" r="5" class="mood" /></g>

        <!-- body -->
        <path d="M34 92c0-8 6-12 26-12s26 4 26 12v18c0 10-10 18-26 18s-26-8-26-18z" fill="url(#rp-shell)" stroke="#b7bddc" stroke-width="1" />
        <circle cx="60" cy="104" r="11" fill="#11142c" />
        <circle cx="60" cy="104" r="11" fill="none" class="ring" stroke-width="2.2" />
        <path d="M53 106 60 109.5 67 106v1.8L60 111.3 53 107.8z" fill="#fff" opacity="0.6" /><path d="M53 102.7 60 106.2 67 102.7v1.8L60 108 53 104.5z" fill="#fff" opacity="0.8" /><path d="M60 96 67 99.5 60 103 53 99.5z" fill="#fff" />

        <!-- neck -->
        <rect x="53" y="74" width="14" height="9" rx="3" fill="#c9cee8" />

        <!-- antenna -->
        <path d="M60 18V9" stroke="#b7bddc" stroke-width="3" stroke-linecap="round" />
        <circle cx="60" cy="7" r="5" class="mood glow" />

        <!-- ears -->
        <circle cx="13" cy="47" r="8" fill="url(#rp-shell)" stroke="#b7bddc" />
        <circle cx="13" cy="47" r="4" class="mood glow" />
        <circle cx="107" cy="47" r="8" fill="url(#rp-shell)" stroke="#b7bddc" />
        <circle cx="107" cy="47" r="4" class="mood glow" />

        <!-- head -->
        <rect x="16" y="16" width="88" height="62" rx="30" fill="url(#rp-shell)" stroke="#b7bddc" stroke-width="1" />
        <path d="M30 24c10-5 50-5 60 0" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.9" fill="none" />

        <!-- visor face -->
        <rect x="25" y="29" width="70" height="42" rx="21" fill="url(#rp-visor)" />
        <path d="M33 35c6-3 14-4 20-4" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.25" fill="none" />

        <!-- cheeks -->
        <ellipse class="cheek" cx="35" cy="59" rx="6" ry="3.5" />
        <ellipse class="cheek" cx="85" cy="59" rx="6" ry="3.5" />

        <!-- eyes -->
        <g class="eyes">
          @switch (mood()) {
            @case ('happy') {
              <path class="eye-line" d="M38 50q6-9 12 0" /><path class="eye-line" d="M70 50q6-9 12 0" />
            }
            @case ('wink') {
              <rect class="eye" x="39" y="40" width="10" height="13" rx="5" /><path class="eye-line" d="M70 48q6-7 12 0" />
            }
            @case ('love') {
              <path class="heart-eye" d="M44 53l-6.5-6.5a4 4 0 0 1 6.5-4.6a4 4 0 0 1 6.5 4.6z" />
              <path class="heart-eye" d="M76 53l-6.5-6.5a4 4 0 0 1 6.5-4.6a4 4 0 0 1 6.5 4.6z" />
            }
            @case ('sleep') {
              <path class="eye-line" d="M38 47q6 4 12 0" /><path class="eye-line" d="M70 47q6 4 12 0" />
            }
            @case ('blink') {
              <rect class="eye fastblink" x="39" y="40" width="10" height="13" rx="5" /><rect class="eye fastblink" x="71" y="40" width="10" height="13" rx="5" />
            }
            @case ('giggle') {
              <path class="eye-line" d="M38 45l7 4-7 4" /><path class="eye-line" d="M82 45l-7 4 7 4" />
            }
            @case ('dizzy') {
              <path class="spiral" d="M44 47m-1 0a1 1 0 1 1 2 0a3 3 0 1 1-5 0a5 5 0 1 1 9 0a6.5 6.5 0 1 1-12 0" />
              <path class="spiral r2" d="M76 47m-1 0a1 1 0 1 1 2 0a3 3 0 1 1-5 0a5 5 0 1 1 9 0a6.5 6.5 0 1 1-12 0" />
            }
            @case ('highfive') {
              <path class="eye-line" d="M38 50q6-9 12 0" /><path class="eye-line" d="M70 50q6-9 12 0" />
            }
            @case ('shy') {
              <rect class="eye" x="35" y="45" width="9" height="10" rx="4.5" /><rect class="eye" x="66" y="45" width="9" height="10" rx="4.5" />
            }
            @case ('wow') {
              <path class="star-eye" d="M44 38l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
              <path class="star-eye" d="M76 38l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
            }
            @case ('cool') {
              <rect class="eye" x="39" y="42" width="10" height="11" rx="5" /><rect class="eye" x="71" y="42" width="10" height="11" rx="5" />
              <g class="shades"><path d="M30 41h60v4H30z" /><rect x="33" y="43" width="22" height="12" rx="5" /><rect x="65" y="43" width="22" height="12" rx="5" /><path class="glint" d="M37 46l5 0M69 46l5 0" /></g>
            }
            @case ('angry') {
              <path class="angry-eye" d="M37 41l13 6v5h-13z" /><path class="angry-eye" d="M83 41l-13 6v5h13z" />
            }
            @case ('sad') {
              <path class="eye-line sad-eye" d="M38 46q6 5 12 0" /><path class="eye-line sad-eye" d="M70 46q6 5 12 0" />
              <path class="tear" d="M46 52q3 5 0 7q-3-2 0-7z" />
            }
            @case ('party') {
              <path class="eye-line" d="M38 50q6-9 12 0" /><path class="eye-line" d="M70 50q6-9 12 0" />
            }
            @case ('yawn') {
              <path class="eye-line" d="M38 46l12 2" /><path class="eye-line" d="M82 46l-12 2" />
            }
            @case ('listen') {
              <circle class="eye" cx="44" cy="47" r="6.5" /><circle class="eye" cx="76" cy="47" r="6.5" />
              <circle cx="46" cy="45" r="2" fill="#fff" /><circle cx="78" cy="45" r="2" fill="#fff" />
            }
            @default {
              <rect class="eye blink" x="39" y="40" width="10" height="13" rx="5" /><rect class="eye blink" x="71" y="40" width="10" height="13" rx="5" />
            }
          }
        </g>

        <!-- mouth -->
        <g class="mouth">
          @switch (mood()) {
            @case ('talk') { <path class="talk-mouth" d="M51 57h18q0 9-9 9t-9-9z" /> }
            @case ('listen') { <circle class="o-mouth" cx="60" cy="61" r="3.2" /> }
            @case ('sleep') { <ellipse class="snore" cx="60" cy="61" rx="3.4" ry="2.4" /> }
            @case ('giggle') { <path class="laugh" d="M49 55h22q0 13-11 13t-11-13z" /><path class="tongue" d="M55 64q5-4 10 0q-5 4-10 0z" /> }
            @case ('dizzy') { <path class="smile wavy" d="M50 61q2.5-3 5 0t5 0t5 0t5 0" /> }
            @case ('shy') { <path class="smile" d="M55 61q4 3 8 0" /> }
            @case ('blink') { <path class="smile" d="M53 59q7 6 14 0" /> }
            @case ('wow') { <ellipse class="o-wow" cx="60" cy="61" rx="5" ry="6" /> }
            @case ('cool') { <path class="smile" d="M54 61q6 3 12-2" /> }
            @case ('angry') { <path class="frown" d="M51 64q9-7 18 0" /> }
            @case ('sad') { <path class="frown sadm" d="M53 64q7-5 14 0" /> }
            @case ('yawn') { <ellipse class="yawn-mouth" cx="60" cy="60" rx="7" ry="8" /> }
            @case ('idle') { <path class="smile" d="M53 59q7 6 14 0" /> }
            @default { <path class="grin" d="M50 56h20q0 11-10 11t-10-11z" /> }
          }
        </g>

        <!-- touch zones (invisible): each part of ALPHA reacts differently -->
        <g class="zones">
          <rect x="16" y="14" width="88" height="64" rx="30" (click)="tap($event, 'head')" />
          <rect x="25" y="29" width="70" height="42" rx="21" (click)="tap($event, 'face')" />
          <rect x="53" y="0" width="14" height="20" (click)="tap($event, 'head')" />
          <circle cx="13" cy="47" r="10" (click)="tap($event, 'ear')" />
          <circle cx="107" cy="47" r="10" (click)="tap($event, 'ear')" />
          <path d="M34 92c0-8 6-12 26-12s26 4 26 12v18c0 10-10 18-26 18s-26-8-26-18z" (click)="tap($event, 'belly')" />
          <rect x="12" y="84" width="20" height="38" rx="9" (click)="tap($event, 'hand')" />
          <rect x="88" y="84" width="20" height="38" rx="9" (click)="tap($event, 'hand')" />
        </g>
      </g>
    </svg>
  `,
  styles: `
    :host { --mood: #2dd4bf; display: block; width: 124px; height: 155px; }
    :host(.m-talk) { --mood: #ff8a4c; }
    :host(.m-listen) { --mood: #38bdf8; }
    :host(.m-happy), :host(.m-wink) { --mood: #f472b6; }
    :host(.m-love) { --mood: #f43f5e; }
    :host(.m-sleep) { --mood: #a78bfa; }
    :host(.m-giggle) { --mood: #facc15; }
    :host(.m-dizzy) { --mood: #a3e635; }
    :host(.m-highfive) { --mood: #fb923c; }
    :host(.m-shy) { --mood: #fb7185; }
    :host(.m-blink) { --mood: #22d3ee; }
    :host(.m-wow) { --mood: #fde047; }
    :host(.m-cool) { --mood: #818cf8; }
    :host(.m-angry) { --mood: #ef4444; }
    :host(.m-sad) { --mood: #60a5fa; }
    :host(.m-party) { --mood: #e879f9; }
    :host(.m-yawn) { --mood: #a78bfa; }
    /* eyes follow the cursor while idle (--ex / --ey come from the parent, -1…1) */
    :host(.m-idle) .eyes, :host(.m-happy) .eyes { transform: translate(calc(var(--ex, 0) * 4px), calc(var(--ey, 0) * 3px)); transition: transform 0.15s ease-out; }
    /* wow: spinning star eyes + sparkles */
    .star-eye { fill: #fde047; filter: drop-shadow(0 0 5px #facc15); transform-box: fill-box; transform-origin: center; animation: twirl 1.4s ease-in-out infinite; }
    @keyframes twirl { 50% { transform: scale(1.2) rotate(25deg); } }
    .o-wow { fill: #fde047; }
    .sparkle path { fill: #fde047; animation: pop 0.5s ease-in-out infinite alternate; }
    :host(.m-wow) .float { animation: hop 0.4s ease-in-out infinite alternate; }
    /* cool: sunglasses drop in */
    .shades { animation: shades 0.45s cubic-bezier(0.3, 1.5, 0.5, 1) both; }
    .shades path:first-child, .shades rect { fill: #0b0b12; stroke: #818cf8; stroke-width: 1; }
    .glint { stroke: #fff; stroke-width: 1.6; stroke-linecap: round; opacity: 0.8; }
    @keyframes shades { from { transform: translateY(-30px); opacity: 0; } }
    :host(.m-cool) .float { animation: groove 0.7s ease-in-out infinite alternate; }
    @keyframes groove { from { transform: rotate(-3deg); } to { transform: rotate(3deg) translateY(-2px); } }
    :host(.m-cool) .arm.r { transform: rotate(-60deg); }
    /* angry: red eyes, frown, steam, shaking */
    .angry-eye { fill: #f87171; filter: drop-shadow(0 0 5px #ef4444); }
    .frown { fill: none; stroke: #f87171; stroke-width: 3; stroke-linecap: round; }
    .steam circle { fill: #e5e7eb; opacity: 0; animation: steam 0.9s ease-out infinite; }
    .steam circle:nth-child(n + 3) { animation-delay: 0.3s; }
    @keyframes steam { 0% { opacity: 0.9; transform: translateY(6px) scale(0.6); } 100% { opacity: 0; transform: translateY(-10px) scale(1.3); } }
    :host(.m-angry) .float { animation: shake 0.09s linear infinite alternate; }
    @keyframes shake { from { transform: translateX(-2px); } to { transform: translateX(2px); } }
    :host(.m-angry) .arm.l { transform: rotate(-25deg); }
    :host(.m-angry) .arm.r { transform: rotate(25deg); }
    /* sad: droopy eyes, tear, slow sag */
    .sad-eye { stroke: #93c5fd; filter: none; }
    .sadm { stroke: #93c5fd; }
    .tear { fill: #60a5fa; animation: tear 1.4s ease-in infinite; }
    @keyframes tear { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(14px); opacity: 0; } }
    :host(.m-sad) .float { animation: none; transform: translateY(4px) rotate(3deg); transition: transform 0.4s; }
    :host(.m-sad) .arm.l, :host(.m-sad) .arm.r { transform: rotate(0deg) translateY(2px); }
    /* party: confetti burst, cheering */
    .cf { animation: confetti 1.2s ease-out infinite; }
    .c0 { fill: #f472b6; --dx: -40px; } .c1 { fill: #facc15; --dx: 38px; } .c2 { fill: #22d3ee; --dx: -24px; } .c3 { fill: #a3e635; --dx: 26px; }
    .c4 { fill: #fb923c; --dx: -50px; } .c5 { fill: #818cf8; --dx: 48px; } .c6 { fill: #f43f5e; --dx: -10px; } .c7 { fill: #2dd4bf; --dx: 12px; }
    .c8 { fill: #e879f9; --dx: -34px; } .c9 { fill: #fde047; --dx: 34px; }
    .c1, .c4, .c7 { animation-delay: 0.15s; } .c2, .c5, .c8 { animation-delay: 0.3s; }
    @keyframes confetti { 0% { transform: translate(0, 0) rotate(0); opacity: 1; } 100% { transform: translate(var(--dx), 30px) rotate(540deg); opacity: 0; } }
    :host(.m-party) .float { animation: hop 0.3s ease-in-out infinite alternate; }
    :host(.m-party) .arm.l { transform: rotate(150deg); }
    :host(.m-party) .arm.r { transform: rotate(-150deg); }
    :host(.m-party) .cheek { opacity: 0.9; }
    /* yawn: stretch */
    .yawn-mouth { fill: #1e1b4b; stroke: #a5b4fc; stroke-width: 2; transform-box: fill-box; transform-origin: center; animation: yawn 2.4s ease-in-out both; }
    @keyframes yawn { 0% { transform: scale(0.3); } 40%, 70% { transform: scale(1); } 100% { transform: scale(0.4); } }
    :host(.m-yawn) .arm.r { transform: rotate(-160deg); transition: transform 0.6s; }
    :host(.m-yawn) .arm.l { transform: rotate(150deg); transition: transform 0.6s; }
    .zones * { fill: transparent; cursor: pointer; pointer-events: all; }
    /* face: quick double blink */
    .fastblink { animation: fblink 0.7s ease-in-out; }
    @keyframes fblink { 0%, 40%, 100% { transform: scaleY(1); } 18%, 62% { transform: scaleY(0.08); } }
    :host(.m-blink) .float { animation: nod 0.7s ease-in-out; }
    @keyframes nod { 30% { transform: translateY(2px) rotate(-3deg); } 70% { transform: translateY(-2px) rotate(2deg); } }
    /* belly: giggle + wiggle, arms hold the tummy */
    .laugh { fill: #7df9ff; filter: drop-shadow(0 0 4px #22d3ee); transform-box: fill-box; transform-origin: 50% 0; animation: laugh 0.22s ease-in-out infinite alternate; }
    @keyframes laugh { to { transform: scaleY(0.7); } }
    .tongue { fill: #fb7185; }
    :host(.m-giggle) .float { animation: wiggle 0.16s linear infinite alternate; }
    @keyframes wiggle { from { transform: rotate(-4deg) translateX(-1px); } to { transform: rotate(4deg) translateX(1px); } }
    :host(.m-giggle) .arm.l { transform: rotate(-55deg); }
    :host(.m-giggle) .arm.r { transform: rotate(55deg); }
    :host(.m-giggle) .cheek { opacity: 0.9; }
    .haha text { fill: #facc15; font: 800 9px 'Syne', sans-serif; animation: snooze 1s ease-out infinite; }
    .haha text + text { animation-delay: 0.4s; }
    /* head / antenna: dizzy spiral eyes, wobble, orbiting stars */
    .spiral { fill: none; stroke: #bef264; stroke-width: 2.4; stroke-linecap: round; transform-box: fill-box; transform-origin: center; animation: spin 0.9s linear infinite; filter: drop-shadow(0 0 3px #a3e635); }
    .spiral.r2 { animation-direction: reverse; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .wavy { stroke: #bef264; }
    :host(.m-dizzy) .float { animation: wobble 1.1s ease-in-out infinite; }
    @keyframes wobble { 25% { transform: rotate(-8deg) translateX(-2px); } 75% { transform: rotate(8deg) translateX(2px); } }
    .st { fill: #fde047; transform-origin: 60px 14px; animation: orbit 1.2s linear infinite; }
    .s2 { animation-delay: -0.4s; } .s3 { animation-delay: -0.8s; }
    @keyframes orbit { from { transform: rotate(0deg) translateX(22px) rotate(0deg) scale(0.8); } to { transform: rotate(360deg) translateX(22px) rotate(-360deg) scale(0.8); } }
    /* hand: high five */
    :host(.m-highfive) .arm.r { transform: rotate(-170deg); }
    :host(.m-highfive) .arm.r circle { filter: drop-shadow(0 0 6px #fb923c); }
    :host(.m-highfive) .float { animation: hop 0.35s ease-in-out 2 alternate; }
    .sparks path { stroke: #fb923c; stroke-width: 2.4; stroke-linecap: round; fill: none; animation: pop 0.4s ease-out infinite alternate; transform: translateY(-48px); }
    @keyframes pop { from { opacity: 0.3; } to { opacity: 1; } }
    /* ears: shy — eyes look down-left, big blush, arms tucked */
    :host(.m-shy) .cheek { opacity: 1; fill: #f43f5e; }
    :host(.m-shy) .float { animation: none; transform: rotate(-6deg); transition: transform 0.3s; }
    :host(.m-shy) .arm.l { transform: rotate(-20deg); }
    :host(.m-shy) .arm.r { transform: rotate(20deg); }
    /* love: heart eyes that pulse + hearts drifting up */
    .heart-eye { fill: #ff5c8a; filter: drop-shadow(0 0 5px #ff5c8a); transform-box: fill-box; transform-origin: center; animation: beat 0.6s ease-in-out infinite; }
    @keyframes beat { 50% { transform: scale(1.18); } }
    .h { fill: #ff5c8a; opacity: 0; animation: rise 1.6s ease-out infinite; }
    .h2 { animation-delay: 0.45s; } .h3 { animation-delay: 0.9s; }
    @keyframes rise { 0% { opacity: 0; transform: translateY(14px) scale(0.6); } 25% { opacity: 1; } 100% { opacity: 0; transform: translateY(-16px) scale(1.1); } }
    :host(.m-love) .float { animation: hop 0.5s ease-in-out infinite alternate; }
    :host(.m-love) .arm.l { transform: rotate(-38deg); }
    :host(.m-love) .arm.r { transform: rotate(38deg); }
    :host(.m-love) .cheek { opacity: 0.95; }
    /* sleepy: eyes closed, slow droopy bob, Z z z */
    .z { fill: #c4b5fd; font: 800 11px 'Syne', sans-serif; opacity: 0; animation: snooze 3s ease-in-out infinite; }
    .z2 { font-size: 9px; animation-delay: 0.7s; } .z3 { font-size: 7px; animation-delay: 1.4s; }
    @keyframes snooze { 0% { opacity: 0; transform: translate(0, 6px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(6px, -10px); } }
    :host(.m-sleep) .float { animation: doze 4s ease-in-out infinite; }
    @keyframes doze { 50% { transform: translateY(3px) rotate(6deg); } }
    :host(.m-sleep) .jet { opacity: 0.3; animation-duration: 1.2s; }
    :host(.m-sleep) .eye-line { stroke: #a5b4fc; filter: none; }
    .snore { fill: none; stroke: #a5b4fc; stroke-width: 2.2; transform-box: fill-box; transform-origin: center; animation: snore 4s ease-in-out infinite; }
    @keyframes snore { 50% { transform: scale(1.5); } }
    svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 12px 18px rgba(20, 16, 60, 0.45)); }
    .mood { fill: var(--mood); transition: fill 0.3s; }
    .moodstop { stop-color: var(--mood); }
    .glow { filter: drop-shadow(0 0 4px var(--mood)); }
    .ring { stroke: var(--mood); filter: drop-shadow(0 0 3px var(--mood)); animation: ring 2s ease-in-out infinite; }
    @keyframes ring { 50% { opacity: 0.45; } }
    .shadow { fill: rgba(0, 0, 0, 0.25); animation: shadow 3s ease-in-out infinite; transform-origin: 60px 146px; }
    @keyframes shadow { 50% { transform: scale(0.8); opacity: 0.6; } }
    .jet { transform-origin: 60px 133px; animation: jet 0.3s ease-in-out infinite alternate; opacity: 0.75; }
    @keyframes jet { to { transform: scale(1.2, 0.8); } }

    .float { animation: bob 3s ease-in-out infinite; transform-origin: 60px 80px; }
    :host(.m-talk) .float { animation-duration: 1.4s; }
    :host(.m-happy) .float { animation: hop 0.55s ease-in-out infinite alternate; }
    @keyframes bob { 50% { transform: translateY(-5px) rotate(-1.5deg); } }
    @keyframes hop { from { transform: translateY(0) rotate(-2deg); } to { transform: translateY(-7px) rotate(2deg); } }
    :host(.m-listen) .float { animation: tilt 2.2s ease-in-out infinite; }
    @keyframes tilt { 50% { transform: rotate(-7deg) translateY(-3px); } }

    .eye { fill: #7df9ff; filter: drop-shadow(0 0 4px #22d3ee); transform-box: fill-box; transform-origin: center; }
    .blink { animation: blink 4.4s infinite; }
    @keyframes blink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
    .eye-line { fill: none; stroke: #7df9ff; stroke-width: 4; stroke-linecap: round; filter: drop-shadow(0 0 4px #22d3ee); }
    :host(.m-listen) .eye { fill: #bae6fd; filter: drop-shadow(0 0 5px #38bdf8); }
    :host(.m-listen) .eyes { animation: look 2.4s ease-in-out infinite; }
    @keyframes look { 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }

    .smile { fill: none; stroke: #7df9ff; stroke-width: 3.2; stroke-linecap: round; filter: drop-shadow(0 0 3px #22d3ee); }
    .grin { fill: #7df9ff; filter: drop-shadow(0 0 4px #22d3ee); }
    .o-mouth { fill: none; stroke: #bae6fd; stroke-width: 2.6; }
    /* talking: a smiling mouth that opens with the voice level */
    .talk-mouth { fill: #ff8a4c; filter: drop-shadow(0 0 4px #ff8a4c); transform-box: fill-box; transform-origin: 50% 0; transform: scaleY(calc(0.5 + var(--lv, 0) * 0.9)); transition: transform 0.07s linear; }

    .cheek { fill: #fb7185; opacity: 0; transition: opacity 0.3s; filter: blur(1.2px); }
    :host(.m-happy) .cheek, :host(.m-wink) .cheek, :host(.m-talk) .cheek { opacity: 0.75; }

    .arm { transform-box: fill-box; transform-origin: 50% 8%; transition: transform 0.4s; }
    :host(.m-talk) .arm.r { animation: wave 0.9s ease-in-out infinite; }
    :host(.m-talk) .arm.l { animation: sway 1.6s ease-in-out infinite; }
    :host(.m-happy) .arm.l { transform: rotate(150deg); }
    :host(.m-happy) .arm.r { transform: rotate(-150deg); }
    :host(.m-wink) .arm.r { transform: rotate(-120deg); }
    @keyframes wave { 0%, 100% { transform: rotate(-150deg); } 50% { transform: rotate(-110deg); } }
    @keyframes sway { 50% { transform: rotate(14deg); } }
    @media (prefers-reduced-motion: reduce) { .float, .jet, .shadow, .arm { animation: none !important; } }
  `,
})
export class Robot {
  readonly mood = input<Mood>('idle');
  /** which part of the robot was touched */
  readonly touched = output<Zone>();
  protected tap(e: Event, z: Zone) {
    e.stopPropagation();
    this.touched.emit(z);
  }
}
