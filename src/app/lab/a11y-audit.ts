/** Runs axe-core on the live page. Call it with no modal dialog open, or the page behind is skipped. */
export async function auditPage(): Promise<string> {
  const { default: axe } = await import('axe-core');
  const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'], resultTypes: ['violations', 'incomplete'] });
  const level = { critical: 0, serious: 1, moderate: 2, minor: 3 } as Record<string, number>;
  const cell = (s: string) => s.replace(/[|`]/g, ' ').replace(/\s+/g, ' ').slice(0, 90);
  const rows = [...r.violations].sort((a, b) => level[a.impact ?? 'minor'] - level[b.impact ?? 'minor']);
  return `## ${rows.length ? `${rows.length} issue type${rows.length > 1 ? 's' : ''} found` : 'No issues found'}\n${r.passes.length} rules passed. ${r.incomplete.length} need a person to check.\n\n${rows.length
    ? `| Impact | Issue | Elements | Example |\n|---|---|---|---|\n${rows.map(v => `| ${v.impact ?? ''} | ${cell(v.help)} | ${v.nodes.length} | ${cell(String(v.nodes[0]?.target.join(' ') ?? ''))} |`).join('\n')}` : ''}\n\nChecked with axe-core on the page as it is now. Automated checks find only some accessibility problems.`;
}
