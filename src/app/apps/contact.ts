import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Icon } from '../core/icon';
import { OsService } from '../core/os.service';
import { EMAILJS, PROFILE } from '../data/portfolio.data';

type Field = 'name' | 'email' | 'message';

@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icon],
  template: `
    <div class="grid">
      <div class="info">
        <p class="kicker">Say hello</p>
        <h2>Let's build something.</h2>
        <p class="lead">Open to Java full-stack roles, freelance projects and good collaborations.</p>
        @for (c of cards; track c.label) {
          <div class="card">
            <span class="ic"><app-icon [name]="c.icon" [size]="17" /></span>
            <span class="t"><small>{{ c.label }}</small>@if (c.href) { <a [href]="c.href" [attr.target]="c.ext ? '_blank' : null" rel="noopener">{{ c.value }}</a> } @else { <b>{{ c.value }}</b> }</span>
            @if (c.copy) { <button type="button" (click)="os.copy(c.copy, c.label)" [attr.aria-label]="'Copy ' + c.label"><app-icon name="copy" [size]="14" /></button> }
          </div>
        }
      </div>
      <form [formGroup]="form" (ngSubmit)="send()" novalidate>
        @for (f of fields; track f.key) {
          <label>
            <span class="mono">{{ f.label }}</span>
            @if (f.key === 'message') { <textarea class="field" [formControlName]="f.key" rows="6" [placeholder]="f.ph"></textarea> }
            @else { <input class="field" [formControlName]="f.key" [type]="f.key === 'email' ? 'email' : 'text'" [placeholder]="f.ph" [attr.autocomplete]="f.key" /> }
            @if (err(f.key); as e) { <em>{{ e }}</em> }
          </label>
        }
        <button type="submit" class="btn hot" [disabled]="sending()">@if (sending()) { Sending… } @else { <app-icon name="send" [size]="15" /> Send message }</button>
        @if (status(); as s) { <p class="st" [class.bad]="!s.ok" role="status">{{ s.text }}</p> }
      </form>
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 22px; padding: 24px; }
    h2 { font-size: 2rem; margin: 6px 0; }
    .lead { color: var(--ink-2); margin-bottom: 14px; }
    .card { display: flex; align-items: center; gap: 12px; padding: 11px 12px; margin-bottom: 8px; border-radius: 14px; background: var(--glass-2); border: 1px solid var(--line); }
    .ic { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--violet), var(--accent)); flex-shrink: 0; }
    .t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .t small { color: var(--ink-3); font: 500 0.66rem var(--mono); text-transform: uppercase; letter-spacing: 0.12em; }
    .t a, .t b { font-weight: 600; font-size: 0.9rem; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .t a:hover { color: var(--accent); }
    .card button { width: 32px; height: 32px; border-radius: 9px; border: 1px solid var(--line-2); background: none; cursor: pointer; display: grid; place-items: center; }
    .card button:hover { color: var(--accent); border-color: var(--accent); }
    form { display: grid; gap: 12px; align-content: start; padding: 18px; border-radius: 18px; background: var(--glass-2); border: 1px solid var(--line); }
    label { display: grid; gap: 5px; }
    label span { font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); }
    textarea { resize: vertical; }
    em { font-style: normal; font-size: 0.78rem; color: #fb7185; }
    .st { font-size: 0.86rem; color: var(--teal); }
    .st.bad { color: #fb7185; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; padding: 16px; } }
  `,
})
export class Contact {
  protected readonly os = inject(OsService);
  protected readonly cards = [
    { icon: 'mail', label: 'Email', value: PROFILE.email, href: 'mailto:' + PROFILE.email, copy: PROFILE.email, ext: false },
    { icon: 'phone', label: 'Phone', value: PROFILE.phone, href: PROFILE.phoneHref, copy: PROFILE.phone, ext: false },
    { icon: 'linkedin', label: 'LinkedIn', value: PROFILE.linkedinUser, href: PROFILE.linkedin, copy: '', ext: true },
    { icon: 'github', label: 'GitHub', value: PROFILE.githubUser, href: PROFILE.github, copy: '', ext: true },
    { icon: 'pin', label: 'Location', value: PROFILE.location, href: '', copy: '', ext: false },
  ];
  protected readonly fields: { key: Field; label: string; ph: string }[] = [
    { key: 'name', label: 'Name', ph: 'Your name' },
    { key: 'email', label: 'Email', ph: 'you@company.com' },
    { key: 'message', label: 'Message', ph: 'Tell me about the role or project…' },
  ];
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });
  protected readonly sending = signal(false);
  protected readonly status = signal<{ ok: boolean; text: string } | null>(null);
  private tick = signal(0);

  constructor() {
    this.form.events.subscribe(() => this.tick.update(n => n + 1));
  }
  protected err(f: Field) {
    this.tick();
    const c = this.form.controls[f];
    if (!c.touched || !c.errors) return '';
    if (c.errors['required']) return 'Required';
    if (c.errors['email']) return 'Enter a valid email';
    if (c.errors['minlength']) return `At least ${c.errors['minlength'].requiredLength} characters`;
    return '';
  }
  protected async send() {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.tick.update(n => n + 1); return; }
    this.sending.set(true);
    try {
      const { default: emailjs } = await import('@emailjs/browser');
      const v = this.form.getRawValue();
      await emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, { from_name: v.name, from_email: v.email, subject: 'Kishore.OS message', message: v.message }, { publicKey: EMAILJS.publicKey });
      this.status.set({ ok: true, text: "Thanks! Message sent — I'll reply soon." });
      this.os.react('party', 2600);
      this.form.reset();
    } catch {
      this.status.set({ ok: false, text: 'Could not send right now — please email me directly.' });
    } finally {
      this.sending.set(false);
    }
  }
}
