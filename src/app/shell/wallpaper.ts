import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, inject, viewChild } from '@angular/core';
import { ThemeService } from '../core/theme.service';
import { VoiceService } from '../core/voice.service';

const FRAG = /* glsl */ `
precision highp float;
uniform float uTime; uniform float uLevel; uniform vec2 uRes; uniform vec2 uMouse; uniform float uDark;
uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 cBg;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise(p); p *= 2.02; a *= 0.5; } return v; }
void main(){
  vec2 uv = vUv; vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);
  float t = uTime * 0.05;
  vec2 m = (uMouse - 0.5) * 0.25;
  // domain-warped flow field -> aurora ribbons
  vec2 q = vec2(fbm(p*1.4 + t + m), fbm(p*1.4 - t + 3.1));
  vec2 r = vec2(fbm(p*1.8 + q*2.2 + vec2(1.7, 9.2) + t*1.6), fbm(p*1.8 + q*2.2 + vec2(8.3, 2.8) - t*1.2));
  float f = fbm(p*1.6 + r*2.0);
  float band = smoothstep(0.25, 0.85, f) * (0.7 + 0.6*uLevel);
  vec3 col = mix(cBg, c1, band);
  col = mix(col, c2, smoothstep(0.45, 0.95, r.x) * 0.75);
  col = mix(col, c3, smoothstep(0.62, 1.0, q.y + 0.25*uLevel) * 0.55);
  // speaking ripple from the bottom-right (where ALPHA lives)
  float d = length(uv - vec2(0.93, 0.08));
  col += c3 * uLevel * 0.35 * smoothstep(0.6, 0.0, d) * (0.6 + 0.4*sin(d*40.0 - uTime*6.0));
  // dotted grid
  vec2 g = fract(uv * uRes / 26.0) - 0.5;
  col += (uDark > 0.5 ? 0.06 : -0.035) * smoothstep(0.08, 0.0, length(g));
  // vignette + grain
  col *= mix(1.0, 0.55, smoothstep(0.35, 1.05, length(uv - 0.5)) * uDark);
  col += (hash(uv*uRes + uTime) - 0.5) * 0.035;
  gl_FragColor = vec4(col, 1.0);
}`;

/** Full-screen WebGL aurora behind the desktop. Brightens and ripples while ALPHA talks. */
@Component({
  selector: 'app-wallpaper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<canvas #cv></canvas>`,
  styles: `:host { position: fixed; inset: 0; z-index: 0; background: var(--bg); } canvas { width: 100%; height: 100%; display: block; }`,
})
export class Wallpaper implements AfterViewInit, OnDestroy {
  private cv = viewChild.required<ElementRef<HTMLCanvasElement>>('cv');
  private theme = inject(ThemeService);
  private voice = inject(VoiceService);
  private cleanup: (() => void)[] = [];
  private setColors?: () => void;

  constructor() {
    effect(() => { this.theme.isDark(); requestAnimationFrame(() => this.setColors?.()); });
  }

  async ngAfterViewInit() {
    const T = await import('three');
    const canvas = this.cv().nativeElement;
    let renderer: import('three').WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' }); } catch { return; }
    // the aurora is soft, so render at reduced resolution and let the browser upscale
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1) * 0.6);
    const scene = new T.Scene();
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const css = () => getComputedStyle(document.documentElement);
    const col = (v: string) => new T.Color(css().getPropertyValue(v).trim() || '#000');
    const u = {
      uTime: { value: 0 }, uLevel: { value: 0 }, uRes: { value: new T.Vector2(1, 1) }, uMouse: { value: new T.Vector2(0.5, 0.5) }, uDark: { value: 1 },
      c1: { value: col('--a1') }, c2: { value: col('--a2') }, c3: { value: col('--a3') }, cBg: { value: col('--a4') },
    };
    this.setColors = () => {
      u.c1.value = col('--a1'); u.c2.value = col('--a2'); u.c3.value = col('--a3'); u.cBg.value = col('--a4');
      u.uDark.value = this.theme.isDark() ? 1 : 0;
      renderer.render(scene, cam);
    };
    this.setColors();
    const mat = new T.ShaderMaterial({ uniforms: u, fragmentShader: FRAG, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }' });
    scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), mat));

    const size = () => { renderer.setSize(innerWidth, innerHeight, false); u.uRes.value.set(innerWidth, innerHeight); renderer.render(scene, cam); };
    size();
    addEventListener('resize', size);
    const mouse = (e: PointerEvent) => u.uMouse.value.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight);
    addEventListener('pointermove', mouse, { passive: true });

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, last = performance.now(), t = 20;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 1000 / 40) return; // ~40 fps is plenty for a slow aurora
      t += (now - last) / 1000;
      last = now;
      u.uTime.value = t;
      u.uLevel.value += (this.voice.level() - u.uLevel.value) * 0.2;
      renderer.render(scene, cam);
    };
    if (!reduced) raf = requestAnimationFrame(loop);
    this.cleanup.push(() => cancelAnimationFrame(raf), () => removeEventListener('resize', size), () => removeEventListener('pointermove', mouse), () => renderer.dispose());
  }

  ngOnDestroy() {
    this.cleanup.forEach(f => f());
  }
}
