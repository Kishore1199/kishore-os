import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AssistantBus } from '../core/assistant.bus';
import { evidence } from '../core/evidence';
import { PROJECTS, SKILL_CATEGORIES } from '../data/portfolio.data';

interface SkillNode { name: string; color: string; projects: string[]; x: number; y: number; a: number; }
const R_IN = 110, R_OUT = 265, C = 400;
const at = (a: number, r: number) => ({ x: C + r * Math.cos(a), y: C + r * Math.sin(a) });

const PNODES = PROJECTS.map((p, i) => ({ title: p.title, color: p.accent, a: (i / PROJECTS.length) * 2 * Math.PI - Math.PI / 2 })).map(p => ({ ...p, ...at(p.a, R_IN) }));
const ANGLE = new Map(PNODES.map(p => [p.title, p.a]));
const ALL = SKILL_CATEGORIES.flatMap(c => c.skills).map(s => ({ name: s.name, color: s.color, projects: evidence(s.name).projects }));
/** skills sit near the projects that use them, so the lines cross less */
const SNODES: SkillNode[] = ALL.filter(s => s.projects.length)
  .map(s => { const v = s.projects.map(t => ANGLE.get(t)!); return { ...s, mean: Math.atan2(v.reduce((n, a) => n + Math.sin(a), 0), v.reduce((n, a) => n + Math.cos(a), 0)) }; })
  .sort((a, b) => a.mean - b.mean)
  .map((s, i, all) => { const a = (i / all.length) * 2 * Math.PI - Math.PI; return { ...s, a, ...at(a, R_OUT) }; });
const REST = ALL.filter(s => !s.projects.length).map(s => s.name);

/** Skills around, projects in the middle; pick one to see its links. */
@Component({
  selector: 'app-skill-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>{{ picked() ? info() : 'Choose a project or a skill to see its links.' }}</p>
    <svg viewBox="0 0 800 800" role="group" aria-label="Graph of skills and the projects that use them">
      @for (e of edges; track $index) { <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" [class.on]="on(e.p) || on(e.s)" [class.off]="picked() && !on(e.p) && !on(e.s)" /> }
      @for (s of skills; track s.name) {
        <g class="node" tabindex="0" role="button" [attr.aria-pressed]="on(s.name)" [attr.aria-label]="s.name + ', used in ' + s.projects.join(', ')" [class.off]="dim(s.name)" (click)="pick(s.name)" (keydown.enter)="pick(s.name)" (keydown.space)="$event.preventDefault(); pick(s.name)">
          <circle [attr.cx]="s.x" [attr.cy]="s.y" r="7" [attr.fill]="s.color" />
          <text [attr.transform]="label(s)" [attr.text-anchor]="left(s) ? 'end' : 'start'" dy="4">{{ s.name }}</text>
        </g>
      }
      @for (p of projects; track p.title) {
        <g class="node proj" tabindex="0" role="button" [attr.aria-pressed]="on(p.title)" [attr.aria-label]="p.title" [class.off]="dim(p.title)" (click)="pick(p.title)" (keydown.enter)="pick(p.title)" (keydown.space)="$event.preventDefault(); pick(p.title)">
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="15" [attr.fill]="p.color" />
          <text [attr.x]="p.x" [attr.y]="p.y + 30" text-anchor="middle">{{ short(p.title) }}</text>
        </g>
      }
    </svg>
    <p class="rest"><b>Listed, with no project named:</b> {{ rest }}</p>
  `,
  styles: `
    :host { display: grid; gap: 8px; } p { font-size: 0.86rem; color: var(--text-2); } p b { color: var(--text); }
    svg { width: 100%; height: auto; max-height: 62dvh; }
    line { stroke: var(--text-3); stroke-opacity: 0.28; } line.on { stroke: var(--accent); stroke-opacity: 0.95; stroke-width: 1.8; } line.off { stroke-opacity: 0.06; }
    .node { cursor: pointer; outline: 0; } .node text { fill: var(--text-2); font-size: 14px; } .proj text { fill: var(--text); font-size: 15px; font-weight: 600; paint-order: stroke; stroke: var(--surface-solid); stroke-width: 4px; }
    .node.off { opacity: 0.25; } .node:focus-visible circle, .node[aria-pressed='true'] circle { stroke: var(--text); stroke-width: 3; }
  `,
})
export class SkillGraph {
  protected readonly projects = PNODES;
  protected readonly skills = SNODES;
  protected readonly rest = REST.join(', ');
  protected readonly edges = SNODES.flatMap(s => s.projects.map(t => { const p = PNODES.find(x => x.title === t)!; return { x1: p.x, y1: p.y, x2: s.x, y2: s.y, p: t, s: s.name }; }));
  protected readonly picked = signal('');
  private readonly links = computed(() => new Set(this.edges.filter(e => e.p === this.picked() || e.s === this.picked()).flatMap(e => [e.p, e.s])));
  protected readonly info = computed(() => { const others = [...this.links()].filter(x => x !== this.picked()); return `${this.picked()}: ${others.join(', ') || 'no links'}.`; });
  protected on = (n: string) => this.picked() === n;
  protected dim = (n: string) => !!this.picked() && !this.links().has(n) && this.picked() !== n;
  protected left = (s: SkillNode) => Math.cos(s.a) < 0;
  protected label = (s: SkillNode) => { const { x, y } = at(s.a, R_OUT + 14); return `translate(${x} ${y}) rotate(${(s.a * 180) / Math.PI + (this.left(s) ? 180 : 0)})`; };
  protected short = (t: string) => t.replace(' – Online Exams', '').replace(' – CRM', '');
  private bus = inject(AssistantBus);

  protected pick(n: string) {
    this.picked.update(p => (p === n ? '' : n));
    if (PROJECTS.some(p => p.title === this.picked())) this.bus.showProject(this.picked());
  }
}
