import { LabId } from './lab-ids';

export type Values = Record<string, string>;
export interface LabLink { label: string; url: string; }
export interface LabResult { text: string; links?: LabLink[]; }
export interface LabField {
  key: string; label: string; type: 'text' | 'area' | 'select' | 'file';
  placeholder?: string; options?: readonly string[]; optional?: boolean; max?: number;
}
export interface LabTool {
  id: LabId;
  title: string;
  intro: string;
  fields: LabField[];
  cta?: string;
  /** shown instead of the form */
  view?: 'graph' | 'timeline' | 'quiz' | 'saved' | 'trace' | 'semantic' | 'sql-run' | 'run-code' | 'meeting' | 'offline' | 'guestbook' | 'detective' | 'rps' | 'race' | 'studio' | 'daily';
  /** one AI request; without AI `local` is used */
  ai?: { system: string; prompt: (v: Values) => string | Promise<string>; tokens?: number };
  /** the result that needs no AI */
  local: (v: Values) => LabResult | Promise<LabResult>;
  /** code and advice that visitors should check before using */
  caution?: string;
  /** the result is "Subject: …" plus a message, so it can go in the contact form */
  email?: boolean;
}
