import { Injectable, inject } from '@angular/core';
import { AgentTools, TOOL_DECLARATIONS } from './agent.tools';
import { buildReport } from './job-match';
import { WEBMCP_ORIGIN_TRIAL_TOKEN } from './site.config';

interface McpTool {
  name: string; description: string; inputSchema: unknown;
  annotations: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<string>;
}
interface ModelContext { registerTool(tool: McpTool, o?: { signal?: AbortSignal }): Promise<void> | void; }

/** Only tools that are safe for somebody else's agent: nothing here sends, copies or changes settings. */
const SHARED: Record<string, McpTool['annotations']> = {
  findEvidence: { readOnlyHint: true },
  searchStudyNotes: { readOnlyHint: true },
  githubActivity: { readOnlyHint: true, untrustedContentHint: true },
  goToSection: { readOnlyHint: false },
  showProject: { readOnlyHint: false },
  draftMessage: { readOnlyHint: false },
};

/** Shares ALPHA's tools with AI agents in the visitor's browser (WebMCP, a Chrome origin trial). */
@Injectable({ providedIn: 'root' })
export class WebMcp {
  private tools = inject(AgentTools);

  async register(): Promise<void> {
    if (WEBMCP_ORIGIN_TRIAL_TOKEN) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'origin-trial';
      meta.content = WEBMCP_ORIGIN_TRIAL_TOKEN;
      document.head.append(meta);
    }
    const mc = (document as { modelContext?: ModelContext }).modelContext;
    if (!mc?.registerTool) return;
    const list: McpTool[] = TOOL_DECLARATIONS.filter(d => SHARED[d.name]).map(d => ({
      name: d.name,
      description: d.description ?? d.name,
      inputSchema: d.parameters ?? { type: 'object', properties: {} },
      annotations: SHARED[d.name],
      execute: async input => JSON.stringify((await this.tools.run(d.name, input ?? {})).data),
    }));
    list.push({
      name: 'matchJobRequirements',
      description: 'Check a list of job requirements against the evidence on Kishore V’s portfolio. Returns a status per requirement: proven, listed, partial, gap or ask.',
      inputSchema: { type: 'object', properties: { skills: { type: 'array', items: { type: 'string' }, description: 'Up to 20 technologies or practices.' } }, required: ['skills'] },
      annotations: { readOnlyHint: true },
      execute: async input => {
        const skills = (Array.isArray(input?.['skills']) ? input['skills'] : []).filter((s): s is string => typeof s === 'string').map(s => s.trim().slice(0, 80)).filter(Boolean).slice(0, 20);
        const { rows, summary } = buildReport({ role: '', requirements: skills.map(text => ({ text, kind: 'skill' as const, must: true })) }, 'keywords');
        return JSON.stringify({ summary, rows: rows.map(({ label, status, detail }) => ({ label, status, detail })) });
      },
    });
    for (const t of list) {
      try { await mc.registerTool(t); }
      catch (e) { console.warn(`[ALPHA] WebMCP tool ${t.name} was not registered`, e); }
    }
  }
}
