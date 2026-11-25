import type { LabId } from '../lab/lab-ids';
import type { AppId } from '../core/os.service';
import { FIRESTORE_EXTRAS } from '../core/site.config';

/** how a feature runs · none: no AI · ai: Gemini with a no-AI fallback · browser: built into the visitor's browser */
export type Runs = 'none' | 'ai' | 'browser';
export type AiAction = { lab: LabId } | { win: AppId } | { do: 'tile' | 'spotlight' | 'pet' | 'notifications' | 'wallpaper' | 'chat' | 'live' | 'tour' | 'match' | 'interview' | 'java-interview' | 'draft' | 'wake' | 'listen' | 'scroll-notes' } | null;
export interface AiFeature { title: string; text: string; icon: string; group: AiGroup; runs: Runs; action: AiAction; }
export const AI_GROUPS = ['Portfolio AI', 'Developer AI Lab', 'Interactive', 'Behind the scenes'] as const;
export type AiGroup = (typeof AI_GROUPS)[number];
export const RUNS_LABEL: Record<Runs, string> = { none: 'No AI needed', ai: 'Gemini, with a no-AI version', browser: 'Runs in your browser' };

const f = (group: AiGroup, icon: string, title: string, runs: Runs, action: AiAction, text: string): AiFeature => ({ group, icon, title, runs, action, text });

export const AI_FEATURES: AiFeature[] = [
  f('Portfolio AI', 'spark', 'Personal AI twin', 'ai', { lab: 'twin' }, 'Answers in the first person from this portfolio.'),
  f('Portfolio AI', 'cpu', 'Portfolio chatbot', 'ai', { do: 'chat' }, 'ALPHA answers questions and works the desktop.'),
  f('Portfolio AI', 'search', 'Project exploration agent', 'ai', { lab: 'explore' }, 'Ask anything about one project.'),
  f('Portfolio AI', 'list-check', 'Skills analysis', 'none', { lab: 'skills' }, 'How much evidence each skill has.'),
  f('Portfolio AI', 'briefcase', 'Recruiter assistant', 'ai', { lab: 'recruiter' }, 'A brief with strengths, gaps and questions.'),
  f('Portfolio AI', 'check', 'Job description matcher', 'ai', { do: 'match' }, 'Requirement-by-requirement match, gaps included.'),
  f('Portfolio AI', 'network', 'Hiring panel', 'ai', { do: 'match' }, 'Recruiter, tech lead and critic discuss a match.'),
  f('Portfolio AI', 'file', 'Resume analyzer', 'ai', { lab: 'resume' }, 'Checks your resume against good practice and a role.'),
  f('Portfolio AI', 'file', 'Cover letter generator', 'ai', { lab: 'cover-letter' }, 'A draft letter from Kishore for your job.'),
  f('Portfolio AI', 'mail', 'Email generator', 'ai', { lab: 'email' }, 'Drafts an email to Kishore.'),
  f('Portfolio AI', 'send', 'Contact agent', 'ai', { do: 'draft' }, 'Fills in the contact form. Only you can send.'),
  f('Portfolio AI', 'grad', 'Career recommendation', 'ai', { lab: 'career' }, 'Roles that suit your skills, and what to learn.'),
  f('Portfolio AI', 'play', 'Guided tour', 'none', { do: 'tour' }, 'ALPHA opens each window and talks you through it.'),
  f('Portfolio AI', 'layout', 'Project comparison', 'none', { lab: 'compare' }, 'Two projects side by side.'),
  f('Portfolio AI', 'github', 'GitHub explorer', 'none', { lab: 'github' }, 'Public repositories, read live.'),
  f('Portfolio AI', 'book-open', 'Project documentation', 'ai', { lab: 'docs' }, 'A README for any project.'),
  f('Portfolio AI', 'server', 'Architecture explainer', 'ai', { lab: 'architecture' }, 'How a project probably fits together.'),

  f('Portfolio AI', 'calendar', 'Meeting agent', 'none', { lab: 'meeting' }, 'A calendar file and a draft message from "Tuesday 4 pm".'),
  f('Developer AI Lab', 'flask', 'Agent test suite', 'none', { lab: 'evals' }, '32 tests of the agent, run in front of you.'),
  f('Developer AI Lab', 'server', 'Agent trace viewer', 'none', { lab: 'trace' }, 'Steps, tools, time and tokens.'),
  f('Developer AI Lab', 'search', 'Search by meaning', 'browser', { lab: 'semantic' }, 'A 2 MB model that finds notes in your own words.'),
  f('Developer AI Lab', 'database', 'SQL playground', 'browser', { lab: 'sql-run' }, 'Run SQL on sample tables.'),
  f('Developer AI Lab', 'terminal', 'JavaScript runner', 'browser', { lab: 'run-code' }, 'Run code in a sealed sandbox.'),
  f('Developer AI Lab', 'coffee', 'Java coding assistant', 'ai', { lab: 'java' }, 'Java code with explanations.'),
  f('Developer AI Lab', 'leaf', 'Spring Boot generator', 'ai', { lab: 'spring-boot' }, 'A CRUD API from an entity.'),
  f('Developer AI Lab', 'database', 'SQL query assistant', 'ai', { lab: 'sql' }, 'Queries for four databases.'),
  f('Developer AI Lab', 'code', 'Angular assistant', 'ai', { lab: 'angular' }, 'Standalone components and signals.'),
  f('Developer AI Lab', 'network', 'Microservices designer', 'ai', { lab: 'microservices' }, 'Services, data and a diagram.'),
  f('Developer AI Lab', 'tree', 'Mermaid diagram generator', 'ai', { lab: 'diagram' }, 'Describe a flow and see it drawn.'),
  f('Developer AI Lab', 'search', 'Code review', 'ai', { lab: 'review' }, 'Problems in pasted code, worst first.'),
  f('Developer AI Lab', 'coffee', 'Java interview agent', 'ai', { do: 'java-interview' }, 'Core Java questions, scored.'),
  f('Developer AI Lab', 'mic', 'Mock interview', 'ai', { do: 'interview' }, 'Five questions that adapt to you.'),
  f('Developer AI Lab', 'list-check', 'Technical quiz', 'ai', { lab: 'quiz' }, 'Multiple choice from the notes.'),
  f('Developer AI Lab', 'wrench', 'Debugging assistant', 'ai', { lab: 'debug' }, 'Likely causes for an error.'),
  f('Developer AI Lab', 'calendar', 'Learning roadmap', 'ai', { lab: 'roadmap' }, 'A weekly plan through the notes.'),
  f('Developer AI Lab', 'book-open', 'Concept explainer', 'ai', { lab: 'explain' }, 'Any topic, at your level.'),
  f('Developer AI Lab', 'search', 'Answers from notes', 'ai', { do: 'scroll-notes' }, 'ALPHA quotes 2,700+ notes and names the chapter.'),

  f('Interactive', 'mic', 'Live talk', 'browser', { do: 'live' }, 'A hands-free conversation with ALPHA, turn by turn.'),
  f('Interactive', 'pin', 'Voice remote control', 'browser', { do: 'chat' }, 'Say “scroll down”, “next project” or “dark mode”.'),
  f('Interactive', 'layout', 'Window agent', 'ai', { do: 'tile' }, 'Say “tile everything” or “put projects next to skills”.'),
  f('Interactive', 'terminal', 'AI terminal', 'ai', { win: 'terminal' }, 'Ask in plain English at the command line.'),
  f('Interactive', 'search', 'Smart Spotlight', 'ai', { do: 'spotlight' }, 'Ctrl K finds things and answers questions.'),
  f('Interactive', 'folder', 'Files app', 'browser', { win: 'files' }, 'Saved results as files: open, rename, download.'),
  f('Interactive', 'activity', 'Agent activity', 'none', { win: 'monitor' }, 'Watch what ALPHA is doing, live.'),
  f('Interactive', 'search', 'Skill detective', 'none', { lab: 'detective' }, 'Guess the skill from as few clues as you can.'),
  f('Interactive', 'spark', 'Rock, paper, scissors', 'none', { lab: 'rps' }, 'ALPHA learns your habits as you play.'),
  f('Interactive', 'terminal', 'Code typing race', 'none', { lab: 'race' }, 'Type a line of code faster than ALPHA.'),
  f('Interactive', 'play', 'Robot studio', 'none', { lab: 'studio' }, 'Direct ALPHA in a show of your own.'),
  f('Interactive', 'calendar', 'Daily challenge', 'none', { lab: 'daily' }, 'One question a day. Keep your streak.'),
  f('Interactive', 'mic', 'Voice assistant', 'browser', { do: 'wake' }, 'Say "Alpha" and ask out loud.'),
  f('Interactive', 'volume', 'Text to speech', 'browser', { do: 'listen' }, 'Windows and results read aloud.'),
  f('Interactive', 'tree', 'Skill graph', 'none', { lab: 'graph' }, 'Skills linked to projects.'),
  f('Interactive', 'calendar', 'Project timeline', 'none', { lab: 'timeline' }, 'Education, jobs and projects in order.'),
  f('Interactive', 'layout', 'AI-generated diagrams', 'ai', { lab: 'diagram' }, 'Drawn with Mermaid; saved as SVG.'),
  f('Interactive', 'pin', 'Navigation agent', 'none', { lab: 'navigate' }, 'Say where to go, in steps.'),
  f('Interactive', 'file', 'Resume PDF analysis', 'ai', { lab: 'resume' }, 'The PDF is read in your browser.'),
  f('Interactive', 'check', 'AI answer checker', 'ai', { lab: 'evaluate' }, 'Scores an AI answer and flags claims.'),
  f('Interactive', 'network', 'Agent team', 'ai', { lab: 'team' }, 'Planner, researcher, writer, critic and editor.'),
  f('Interactive', 'search', 'Accessibility audit', 'none', { lab: 'accessibility' }, 'Checks this desktop with axe-core.'),
  f('Interactive', 'download', 'Offline app', 'browser', { lab: 'offline' }, 'Install Kishore.OS and use it without internet.'),
  f('Interactive', 'book-open', 'Guestbook', 'none', { win: 'guestbook' }, 'Leave a public note.'),
  f('Interactive', 'database', 'Saved results', 'browser', { win: 'files' }, 'Kept in IndexedDB, on this device.'),

  f('Behind the scenes', 'refresh', 'Session memory', 'browser', null, 'The chat survives a reload until you close the tab.'),
  f('Behind the scenes', 'database', 'Visitor memory', 'browser', null, 'Remembers your interests here. "Forget me" clears it.'),
  f('Behind the scenes', 'pin', 'Proactive guide', 'none', null, 'Offers help when you stay in a window.'),
  f('Behind the scenes', 'cpu', 'On-device AI', 'browser', null, 'Chrome\'s own model when Gemini is resting.'),
  f('Behind the scenes', 'spark', 'Select and ask', 'ai', null, 'Select text in a window, then "Ask ALPHA".'),
  f('Behind the scenes', 'globe', 'Tamil and Hindi', 'ai', null, 'Choose the answer language in the chat.'),
  f('Behind the scenes', 'check', 'Feedback buttons', 'none', null, 'Rate any AI answer.'),
  f('Behind the scenes', 'code', 'AI-friendly site', 'none', null, 'llms.txt and structured data for AI and search.'),
  ...(FIRESTORE_EXTRAS ? [f('Behind the scenes', 'database', 'Shared answer cache', 'none', null, 'Approved answers cost no AI requests.')] : []),
  f('Behind the scenes', 'layers', 'Tools as windows', 'browser', null, 'Every AI tool is a window, so several can run at once.'),
  f('Behind the scenes', 'refresh', 'Session restore', 'browser', null, 'Brings back the windows from last time.'),
  f('Behind the scenes', 'message', 'Notification centre', 'none', { do: 'notifications' }, 'The daily challenge, tips and messages.'),
  f('Behind the scenes', 'heart-pulse', 'Robot pet', 'none', { do: 'pet' }, 'ALPHA walks along the dock and sits on windows.'),
  f('Behind the scenes', 'sun', 'Wallpaper mood', 'none', { do: 'wallpaper' }, 'The wallpaper follows ALPHA and the time of day.'),
  f('Behind the scenes', 'globe', 'WebMCP tools', 'browser', null, 'Lets your own AI agent use this site, where enabled.'),
];
