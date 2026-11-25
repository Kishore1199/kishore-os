import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type Mood = 'idle' | 'happy' | 'talk' | 'listen' | 'wink' | 'love' | 'sleep' | 'blink' | 'giggle' | 'dizzy' | 'highfive' | 'shy'
  | 'wow' | 'cool' | 'angry' | 'sad' | 'party' | 'yawn';
export type Zone = 'face' | 'belly' | 'head' | 'hand' | 'ear' | 'feet';

/**
 * ALPHA's body: a glossy white robot with a black screen face, striped blue eyes, three antennae and black-jointed arms.
 * Its colours never change: only the pose and the face show the mood.
 * The face changes with `mood`; the mouth opening follows the inherited CSS variable --lv (voice level 0…1).
 */
@Component({
  selector: 'app-robot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': "'m-' + mood()" },
  template: `
    <svg viewBox="0 -14 120 166" aria-hidden="true">
      <defs>
        <linearGradient id="rp-shell" x1="0.05" y1="0" x2="1" y2="0.85"><stop offset="0" stop-color="#cfeafd" /><stop offset="0.22" stop-color="#fbfbff" /><stop offset="0.6" stop-color="#e3e0f0" /><stop offset="0.86" stop-color="#c3bfdb" /><stop offset="1" stop-color="#7cc4f7" /></linearGradient>
        <linearGradient id="rp-body" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#8fcdf8" /><stop offset="0.16" stop-color="#f3f2fb" /><stop offset="0.6" stop-color="#e2dfee" /><stop offset="0.88" stop-color="#bdb8d4" /><stop offset="1" stop-color="#6bbaf5" /></linearGradient>
        <linearGradient id="rp-limb" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#b9dffa" /><stop offset="0.35" stop-color="#f6f5fc" /><stop offset="1" stop-color="#bab6d2" /></linearGradient>
        <radialGradient id="rp-ball" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffffff" /><stop offset="0.6" stop-color="#dcdaec" /><stop offset="1" stop-color="#8fc6f2" /></radialGradient>
        <radialGradient id="rp-visor" cx="0.5" cy="0.34" r="0.75"><stop offset="0" stop-color="#4a3838" /><stop offset="0.3" stop-color="#1d1718" /><stop offset="0.65" stop-color="#08080c" /><stop offset="1" stop-color="#020205" /></radialGradient>
        <pattern id="rp-led" width="4" height="2.6" patternUnits="userSpaceOnUse"><rect width="4" height="2.6" fill="#4aaef2" /><rect width="4" height="1.7" fill="#c4e8ff" /></pattern>
      </defs>

      <ellipse class="shadow" cx="60" cy="149" rx="21" ry="3" />

      <g class="float">
        <!-- body -->
        <g class="body" transform="translate(0 4)">
          <path d="M46 133q14 5 28 0l-3 6q-11 5-22 0z" fill="url(#rp-body)" class="edge" />
          <path class="black" d="M42.5 126q17.5 7 35 0l-2.5 7q-15 6-30 0z" />
          <path d="M34 101q0-13 15-13h22q15 0 15 13 0 15-8.5 25.5-17.5 7-35 0Q34 116 34 101z" fill="url(#rp-body)" class="edge" />
          <path d="M42 93q12-3.5 25-1.5" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.8" fill="none" />
          <path d="M79 100q1 12-6 21" stroke="#58b4f5" stroke-width="2" stroke-linecap="round" opacity="0.5" fill="none" />
          <rect x="50" y="82" width="20" height="8" rx="3.5" class="black" /><path d="M50.5 86h19" stroke="#4d5068" stroke-width="1" />
        </g>

        <!-- head -->
        <g class="head">
          <path class="rod" d="M60 14V-3M26 22 19 2M94 22l7-20" />
          <circle cx="60" cy="-6" r="5" fill="url(#rp-ball)" class="edge" /><circle cx="18" cy="-1" r="4.4" fill="url(#rp-ball)" class="edge" /><circle cx="102" cy="-1" r="4.4" fill="url(#rp-ball)" class="edge" />
          <path class="cap" d="M55 12.5q5-3 10 0M22.5 24l5-3.5M97.5 24l-5-3.5" />
          <ellipse cx="11" cy="53" rx="8" ry="13" fill="url(#rp-shell)" class="edge" /><ellipse cx="9.5" cy="53" rx="5" ry="9" class="ear" />
          <ellipse cx="109" cy="53" rx="8" ry="13" fill="url(#rp-shell)" class="edge" /><ellipse cx="110.5" cy="53" rx="5" ry="9" class="ear" />
          <path d="M60 10c32 0 47 15 47 42 0 24-14 36-47 36S13 76 13 52c0-27 15-42 47-42z" fill="url(#rp-shell)" class="edge" />
          <path d="M28 27q12-8.5 30-9" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.85" fill="none" />
          <path d="M103 46q2 22-14 32" stroke="#4fb0f5" stroke-width="2.4" stroke-linecap="round" opacity="0.55" fill="none" />
          <path d="M60 23c27 0 38.5 3 39 26 .5 21-6 30-39 30S20.5 70 21 49c.5-23 12-26 39-26z" fill="#7a89a8" opacity="0.5" />
          <path d="M60 25c26 0 36.5 3 37 24 .5 19-6 28-37 28S22.5 68 23 49c.5-21 11-24 37-24z" fill="url(#rp-visor)" />
          <path d="M32 33q10-4 24-4" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.28" fill="none" />
            <!-- eyes -->
            <g class="eyes">
              @switch (mood()) {
                @case ('happy') {
                  <path class="eye-line" d="M38 50q6-9 12 0" /><path class="eye-line" d="M70 50q6-9 12 0" />
                }
                @case ('wink') {
                  <circle class="eye" cx="44" cy="47" r="8" /><path class="eye-line" d="M70 48q6-7 12 0" />
                }
                @case ('love') {
                  <path class="heart-eye" d="M44 53l-6.5-6.5a4 4 0 0 1 6.5-4.6a4 4 0 0 1 6.5 4.6z" />
                  <path class="heart-eye" d="M76 53l-6.5-6.5a4 4 0 0 1 6.5-4.6a4 4 0 0 1 6.5 4.6z" />
                }
                @case ('sleep') {
                  <path class="eye-line" d="M38 47q6 4 12 0" /><path class="eye-line" d="M70 47q6 4 12 0" />
                }
                @case ('blink') {
                  <circle class="eye fastblink" cx="44" cy="47" r="8" /><circle class="eye fastblink" cx="76" cy="47" r="8" />
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
                  <circle class="eye" cx="40" cy="50" r="6" /><circle class="eye" cx="71" cy="50" r="6" />
                }
                @case ('wow') {
                  <path class="star-eye" d="M44 38l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
                  <path class="star-eye" d="M76 38l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
                }
                @case ('cool') {
                  <circle class="eye" cx="44" cy="47" r="7" /><circle class="eye" cx="76" cy="47" r="7" />
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
                  <circle class="eye" cx="44" cy="47" r="9" /><circle class="eye" cx="76" cy="47" r="9" />
                }
                @default {
                  <circle class="eye blink" cx="44" cy="47" r="8" /><circle class="eye blink" cx="76" cy="47" r="8" />
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
                @case ('blink') { <path class="grin" d="M52.5 60h15q0 8-7.5 8t-7.5-8z" /> }
                @case ('wow') { <ellipse class="o-wow" cx="60" cy="61" rx="5" ry="6" /> }
                @case ('cool') { <path class="smile" d="M54 61q6 3 12-2" /> }
                @case ('angry') { <path class="frown" d="M51 64q9-7 18 0" /> }
                @case ('sad') { <path class="frown sadm" d="M53 64q7-5 14 0" /> }
                @case ('yawn') { <ellipse class="yawn-mouth" cx="60" cy="60" rx="7" ry="8" /> }
                @case ('idle') { <path class="grin" d="M52.5 60h15q0 8-7.5 8t-7.5-8z" /> }
                @default { <path class="grin" d="M50 56h20q0 11-10 11t-10-11z" /> }
              }
            </g>
        </g>

        <!-- arms: upper arm, elbow, forearm and fingers -->
        <g transform="translate(0 4)">
          <g class="arm l">
            <rect x="22.5" y="97" width="9.5" height="19" rx="4.75" fill="url(#rp-limb)" class="edge" /><circle cx="32" cy="98" r="5" class="black" />
            <g class="fore"><path class="fb" d="M23.5 138L21.5 142.5" /><path class="ft" d="M21.5 142.5L20.6 145.2" /><path class="fb" d="M26.3 139L25.6 144.5" /><path class="ft" d="M25.6 144.5L25.4 147.6" /><path class="fb" d="M29.2 138.6L29.8 144" /><path class="ft" d="M29.8 144L30.2 146.8" /><path class="fb" d="M30.5 135L33.5 138" /><path class="ft" d="M33.5 138L35 140.2" /><circle cx="26.5" cy="135.5" r="5.2" fill="url(#rp-limb)" class="edge" /><circle cx="27" cy="117" r="4.6" class="black" />
              <rect x="21.2" y="118" width="11" height="14" rx="5" fill="url(#rp-limb)" class="edge" /><rect x="22" y="129" width="9.4" height="3.4" rx="1.7" class="black" /></g>
          </g>
          <g class="arm r">
            <rect x="88" y="97" width="9.5" height="19" rx="4.75" fill="url(#rp-limb)" class="edge" /><circle cx="88" cy="98" r="5" class="black" />
            <g class="fore"><path class="fb" d="M96.5 138L98.5 142.5" /><path class="ft" d="M98.5 142.5L99.4 145.2" /><path class="fb" d="M93.7 139L94.4 144.5" /><path class="ft" d="M94.4 144.5L94.6 147.6" /><path class="fb" d="M90.8 138.6L90.2 144" /><path class="ft" d="M90.2 144L89.8 146.8" /><path class="fb" d="M89.5 135L86.5 138" /><path class="ft" d="M86.5 138L85 140.2" /><circle cx="93.5" cy="135.5" r="5.2" fill="url(#rp-limb)" class="edge" /><circle cx="93" cy="117" r="4.6" class="black" />
              <rect x="87.8" y="118" width="11" height="14" rx="5" fill="url(#rp-limb)" class="edge" /><rect x="88.6" y="129" width="9.4" height="3.4" rx="1.7" class="black" /></g>
          </g>
        </g>
        <!-- touch zones (invisible): each part of ALPHA reacts differently -->
        <g class="zones">
          <path d="M60 10c32 0 47 15 47 42 0 24-14 36-47 36S13 76 13 52c0-27 15-42 47-42z" (click)="tap($event, 'head')" />
          <circle cx="60" cy="-4" r="9" (click)="tap($event, 'head')" /><circle cx="18" cy="1" r="9" (click)="tap($event, 'head')" /><circle cx="102" cy="1" r="9" (click)="tap($event, 'head')" />
          <path d="M60 25c26 0 36.5 3 37 24 .5 19-6 28-37 28S22.5 68 23 49c.5-21 11-24 37-24z" (click)="tap($event, 'face')" />
          <ellipse cx="8" cy="53" rx="9" ry="15" (click)="tap($event, 'ear')" /><ellipse cx="112" cy="53" rx="9" ry="15" (click)="tap($event, 'ear')" />
          <path d="M34 101q0-13 15-13h22q15 0 15 13 0 15-8.5 25.5-17.5 7-35 0Q34 116 34 101z" (click)="tap($event, 'belly')" />
          <rect x="42" y="126" width="36" height="18" rx="7" (click)="tap($event, 'feet')" />
          <rect x="15" y="94" width="18" height="56" rx="8" (click)="tap($event, 'hand')" /><rect x="87" y="94" width="18" height="56" rx="8" (click)="tap($event, 'hand')" />
        </g>
      </g>

      <!-- effects, in front and never in the way of a tap -->
      <g class="fx">
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
      </g>
    </svg>
  `,
  styles: `
    /* One fixed palette: reactions change the pose and the face, never the colours. */
    :host { --led: #7cc9fb; --glow: #2f9df0; --ink: #26283c; display: block; width: 118px; height: 163px; }
    svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 12px 18px rgba(20, 16, 60, 0.4)); }
    .edge { stroke: rgba(70, 80, 130, 0.28); stroke-width: 0.8; } .black { fill: var(--ink); stroke: rgba(160, 190, 240, 0.35); stroke-width: 0.6; }
    .rod { fill: none; stroke: #c6c4da; stroke-width: 2.4; stroke-linecap: round; } .cap { fill: none; stroke: #a9a6c4; stroke-width: 3; stroke-linecap: round; }
    .ear { fill: #a9d6f8; stroke: #5aa9e6; stroke-width: 1.6; }
    .fb { stroke: #dcd9ea; stroke-width: 3.2; stroke-linecap: round; } .ft { stroke: var(--ink); stroke-width: 3.2; stroke-linecap: round; }
    .fx { pointer-events: none; } .zones * { fill: transparent; cursor: pointer; pointer-events: all; }
    .shadow { fill: rgba(0, 0, 0, 0.28); transform-origin: 60px 149px; animation: shadow 3s ease-in-out infinite; } @keyframes shadow { 50% { transform: scale(0.82); opacity: 0.6; } }

    /* ── face ── */
    .eye, .grin, .laugh, .talk-mouth { fill: url(#rp-led); filter: drop-shadow(0 0 3px var(--glow)); }
    .eye { transform-box: fill-box; transform-origin: center; }
    .eye-line, .smile, .frown, .o-mouth, .snore, .spiral, .yawn-mouth { fill: none; stroke: var(--led); stroke-width: 3.6; stroke-linecap: round; filter: drop-shadow(0 0 3px var(--glow)); }
    .spiral { stroke-width: 2.4; transform-box: fill-box; transform-origin: center; animation: spin 0.9s linear infinite; } .spiral.r2 { animation-direction: reverse; } @keyframes spin { to { transform: rotate(360deg); } }
    .heart-eye, .star-eye, .angry-eye, .o-wow, .tear { fill: var(--led); filter: drop-shadow(0 0 4px var(--glow)); }
    .heart-eye, .star-eye { transform-box: fill-box; transform-origin: center; animation: beat 0.7s ease-in-out infinite; } @keyframes beat { 50% { transform: scale(1.18); } }
    .tongue { fill: #1f6fb5; } .shades path:first-child, .shades rect { fill: #05060c; stroke: var(--led); stroke-width: 1; } .glint { stroke: #fff; stroke-width: 1.6; stroke-linecap: round; opacity: 0.8; }
    .shades { animation: shades 0.45s cubic-bezier(0.3, 1.5, 0.5, 1) both; } @keyframes shades { from { transform: translateY(-30px); opacity: 0; } }
    .tear { animation: tear 1.4s ease-in infinite; } @keyframes tear { to { transform: translateY(14px); opacity: 0; } }
    .blink { animation: blink 4.4s infinite; } @keyframes blink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
    .fastblink { animation: fblink 0.7s ease-in-out; } @keyframes fblink { 0%, 40%, 100% { transform: scaleY(1); } 18%, 62% { transform: scaleY(0.08); } }
    .laugh { transform-box: fill-box; transform-origin: 50% 0; animation: laugh 0.22s ease-in-out infinite alternate; } @keyframes laugh { to { transform: scaleY(0.7); } }
    .snore { stroke-width: 2.4; transform-box: fill-box; transform-origin: center; animation: snore 4s ease-in-out infinite; } @keyframes snore { 50% { transform: scale(1.5); } }
    .yawn-mouth { stroke-width: 2.4; transform-box: fill-box; transform-origin: center; animation: yawn 2.4s ease-in-out both; } @keyframes yawn { 0% { transform: scale(0.3); } 40%, 70% { transform: scale(1); } 100% { transform: scale(0.4); } }
    /* talking: the mouth opens with the voice level */
    .talk-mouth { transform-box: fill-box; transform-origin: 50% 0; transform: scaleY(calc(0.5 + var(--lv, 0) * 0.9)); transition: transform 0.07s linear; }
    /* eyes follow the pointer while idle (--ex / --ey come from the parent, -1…1) */
    :host(.m-idle) .eyes, :host(.m-happy) .eyes { transform: translate(calc(var(--ex, 0) * 4px), calc(var(--ey, 0) * 3px)); transition: transform 0.15s ease-out; }
    :host(.m-listen) .eyes { animation: look 2.4s ease-in-out infinite; } @keyframes look { 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }

    /* ── body ── */
    .float { transform-origin: 60px 90px; animation: bob 3s ease-in-out infinite; } @keyframes bob { 50% { transform: translateY(-5px); } }
    .head { transform-origin: 60px 84px; transition: transform 0.25s ease-out; }
    :host(.m-idle) .head { transform: rotate(calc(var(--ex, 0) * 4deg)); }
    :host(.walking) .float { animation: rush 0.6s ease-in-out infinite; } @keyframes rush { 0%, 100% { transform: translateY(-3px) rotate(-3deg); } 50% { transform: translateY(-7px) rotate(3deg); } }
    :host(.m-talk) .float { animation-duration: 1.5s; }
    :host(.m-happy) .float, :host(.m-love) .float, :host(.m-wow) .float, :host(.m-party) .float, :host(.m-highfive) .float { animation: hop 0.5s ease-in-out infinite alternate; } @keyframes hop { from { transform: rotate(-2deg); } to { transform: translateY(-8px) rotate(2deg); } }
    :host(.m-party) .float { animation-duration: 0.3s; }
    :host(.m-giggle) .float { animation: wiggle 0.16s linear infinite alternate; } @keyframes wiggle { from { transform: rotate(-4deg); } to { transform: rotate(4deg); } }
    :host(.m-angry) .float { animation: shake 0.09s linear infinite alternate; } @keyframes shake { from { transform: translateX(-2px); } to { transform: translateX(2px); } }
    :host(.m-dizzy) .float { animation: wobble 1.1s ease-in-out infinite; } @keyframes wobble { 25% { transform: rotate(-8deg); } 75% { transform: rotate(8deg); } }
    :host(.m-cool) .float { animation: groove 0.8s ease-in-out infinite alternate; } @keyframes groove { from { transform: rotate(-3deg); } to { transform: rotate(3deg); } }
    :host(.m-listen) .head, :host(.m-wink) .head { transform: rotate(-7deg); } :host(.m-shy) .head { transform: rotate(8deg) translateY(2px); } :host(.m-sad) .head { transform: rotate(6deg) translateY(4px); } :host(.m-sleep) .head { transform: rotate(9deg) translateY(4px); } :host(.m-sleep) .float { animation-duration: 5s; }
    :host(.m-blink) .head { animation: nod 0.7s ease-in-out; } @keyframes nod { 40% { transform: translateY(3px); } }

    /* ── arms: --d mirrors left and right ── */
    .arm.l { --d: 1; transform-origin: 32px 98px; } .arm.r { --d: -1; transform-origin: 88px 98px; } .arm.l .fore { transform-origin: 27px 117px; } .arm.r .fore { transform-origin: 93px 117px; }
    .arm, .fore { transition: transform 0.4s cubic-bezier(0.3, 1.2, 0.5, 1); transform: rotate(calc(var(--d) * var(--a, 6deg))); } .fore { --a: -4deg; }
    /* one hand up, as in a wave */
    :host(.m-talk) .arm.l, :host(.m-wink) .arm.l { --a: 24deg; } :host(.m-wink) .arm.l .fore { --a: 128deg; } :host(.m-talk) .arm.l .fore { animation: wave 1s ease-in-out infinite; } @keyframes wave { 0%, 100% { transform: rotate(112deg); } 50% { transform: rotate(142deg); } }
    :host(.m-talk) .arm.r .fore { animation: show 2s ease-in-out infinite; } @keyframes show { 0%, 100% { transform: rotate(-30deg); } 50% { transform: rotate(-78deg); } }
    :host(.m-listen) .arm.r { --a: 34deg; } :host(.m-listen) .arm.r .fore { --a: 138deg; }
    :host(.m-highfive) .arm.r { --a: 62deg; } :host(.m-highfive) .arm.r .fore { --a: 88deg; }
    /* both up */
    :host(.m-happy) .arm, :host(.m-yawn) .arm { --a: 40deg; } :host(.m-happy) .fore, :host(.m-yawn) .fore { --a: 112deg; } :host(.m-wow) .arm { --a: 26deg; } :host(.m-wow) .fore { --a: 96deg; }
    :host(.m-party) .arm { --a: 46deg; } :host(.m-party) .fore { animation: cheer 0.4s ease-in-out infinite alternate; } :host(.m-party) .arm.r .fore { animation-delay: -0.2s; } @keyframes cheer { from { transform: rotate(calc(var(--d) * 84deg)); } to { transform: rotate(calc(var(--d) * 130deg)); } }
    /* hands together, on the tummy, folded, or on the hips */
    :host(.m-love) .fore { --a: -104deg; } :host(.m-giggle) .fore { --a: -66deg; } :host(.m-shy) .fore { --a: -52deg; } :host(.m-cool) .arm { --a: 10deg; } :host(.m-cool) .fore { --a: -92deg; } :host(.m-angry) .arm { --a: 38deg; } :host(.m-angry) .fore { --a: -84deg; }
    :host(.m-sad) .arm, :host(.m-sleep) .arm { --a: -3deg; }

    /* ── effects, in the same blue ── */
    .h, .st, .sparkle path { fill: var(--led); } .h { opacity: 0; animation: rise 1.6s ease-out infinite; } .h2 { animation-delay: 0.45s; } .h3 { animation-delay: 0.9s; }
    @keyframes rise { 0% { opacity: 0; transform: translateY(14px) scale(0.6); } 25% { opacity: 1; } 100% { opacity: 0; transform: translateY(-16px) scale(1.1); } }
    .st { transform-origin: 60px 14px; animation: orbit 1.2s linear infinite; } .s2 { animation-delay: -0.4s; } .s3 { animation-delay: -0.8s; } @keyframes orbit { from { transform: rotate(0deg) translateX(26px) rotate(0deg) scale(0.8); } to { transform: rotate(360deg) translateX(26px) rotate(-360deg) scale(0.8); } }
    .sparks path { stroke: var(--led); stroke-width: 2.4; stroke-linecap: round; fill: none; animation: pop 0.4s ease-out infinite alternate; } .sparkle path { animation: pop 0.5s ease-in-out infinite alternate; } @keyframes pop { from { opacity: 0.3; } to { opacity: 1; } }
    .haha text, .z { fill: var(--led); font: 800 9px 'Space Grotesk', sans-serif; animation: snooze 1s ease-out infinite; } .haha text + text { animation-delay: 0.4s; } .z { opacity: 0; animation-duration: 3s; } .z1 { font-size: 12px; } .z2 { animation-delay: 0.7s; } .z3 { font-size: 7px; animation-delay: 1.4s; }
    @keyframes snooze { 0% { opacity: 0; transform: translate(0, 6px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(6px, -10px); } }
    .cf { fill: var(--led); animation: confetti 1.2s ease-out infinite; } .c1, .c4, .c7 { fill: #fff; animation-delay: 0.15s; } .c2, .c5, .c8 { fill: #3b9eea; animation-delay: 0.3s; }
    .c0 { --dx: -40px; } .c1 { --dx: 38px; } .c2 { --dx: -24px; } .c3 { --dx: 26px; } .c4 { --dx: -50px; } .c5 { --dx: 48px; } .c6 { --dx: -10px; } .c7 { --dx: 12px; } .c8 { --dx: -34px; } .c9 { --dx: 34px; } @keyframes confetti { to { transform: translate(var(--dx), 30px) rotate(540deg); opacity: 0; } }
    .steam circle { fill: #dfe3f2; opacity: 0; animation: steam 0.9s ease-out infinite; } .steam circle:nth-child(n + 3) { animation-delay: 0.3s; } @keyframes steam { 0% { opacity: 0.9; transform: translateY(6px) scale(0.6); } 100% { opacity: 0; transform: translateY(-10px) scale(1.3); } }
    @media (prefers-reduced-motion: reduce) { .float, .head, .shadow, .arm, .fore { animation: none !important; } }
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
