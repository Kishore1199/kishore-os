/** Shared look of ALPHA's dialogs (job matcher, mock interview). */
export const DIALOG_STYLES = `
    dialog { margin: auto; padding: 0; border: 1px solid var(--border-strong); border-radius: 22px; width: min(720px, calc(100vw - 24px)); max-width: none; max-height: calc(100dvh - 32px); overflow: hidden;
      background: var(--surface-solid); color: var(--text); box-shadow: var(--shadow); }
    dialog[open] { display: flex; }
    dialog::backdrop { background: rgba(5, 5, 10, 0.7); backdrop-filter: blur(8px); }
    .box { flex: 1; min-width: 0; display: flex; flex-direction: column; max-height: calc(100dvh - 34px); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px 14px 22px; border-bottom: 1px solid var(--border); }
    h2 { font-size: 1.05rem; } h3 { font-size: 1rem; margin-bottom: 4px; }
    .body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 18px 22px; display: grid; gap: 14px; align-content: start; }
    label, .sum { font-size: 0.9rem; color: var(--text-2); }
    textarea, select { width: 100%; padding: 12px 14px; font: inherit; font-size: 0.88rem; line-height: 1.5; color: var(--text); background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 14px; }
    select option { background: var(--surface-solid); color: var(--text); }
    textarea { resize: vertical; }
    textarea:focus, select:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    textarea:disabled { opacity: 0.6; }
    .note { font-size: 0.76rem; color: var(--text-2); }
    .err { font-size: 0.84rem; color: var(--bad); }
    .stage { display: flex; align-items: center; gap: 9px; font-size: 0.8rem; color: var(--text-2); }
    .stage i { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--border-strong); border-top-color: var(--accent); animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    :host { --good: #34d399; --info: #60a5fa; --warn: #fbbf24; --bad: #f87171; }
    :host-context([data-theme='light']) { --good: #047857; --info: #1d4ed8; --warn: #92400e; --bad: #b91c1c; }
    ul { list-style: none; margin: 0; padding: 0; }
    footer { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); }
    footer .btn { padding: 9px 16px; font-size: 0.84rem; }
    @media (max-width: 520px) { .body { padding: 16px; } footer .btn { flex: 1; justify-content: center; } }
`;
