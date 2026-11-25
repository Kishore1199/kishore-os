import { APPS, AppId } from './os.service';

/** Things only a desktop can do. No AI. */
export type WinCmd =
  | { do: 'open' | 'close' | 'minimise' | 'maximise'; app: AppId | null }
  | { do: 'snap'; app: AppId | null; to: 'left' | 'right' }
  | { do: 'side'; app: AppId; other: AppId }
  | { do: 'tile' | 'cascade' | 'close-all' | 'desktop' | 'pet-on' | 'pet-off' | 'spotlight' };

const NAMES: [RegExp, AppId][] = [
  [/^(about( me)?|profile|bio)$/, 'about'], [/^projects?$/, 'projects'], [/^(experience|career|jobs?)$/, 'experience'], [/^(skills?|tech stack)$/, 'skills'],
  [/^(study )?notes$|^interview notes$/, 'notes'], [/^(terminal|shell|console|command line)$/, 'terminal'], [/^(contact|contact form)$/, 'contact'],
  [/^(arcade|games?)$/, 'games'], [/^(system )?monitor$|^task manager$/, 'monitor'], [/^(resume|cv)( pdf)?$/, 'resume'], [/^guest ?book$/, 'guestbook'],
  [/^ai ?lab$|^a i lab$/, 'ailab'], [/^(my )?(files|saved files|file manager)$/, 'files'],
];
/** "the terminal" → terminal */
export function appNamed(text: string): AppId | null {
  const t = text.trim().replace(/^(the|his|my|kishore s) /, '').replace(/ (app|window|application|section|page)$/, '').trim();
  return NAMES.find(([r]) => r.test(t))?.[1] ?? null;
}
const title = (id: AppId) => APPS.find(a => a.id === id)!.title;

/** `null` unless the whole message is a window command. */
export function windowCommand(raw: string): { cmd: WinCmd; text: string } | null {
  const q = raw.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(hey |ok )?alpha /, '').replace(/^please /, '').replace(/ please$/, '');
  let m: RegExpMatchArray | null;

  if (/^tile$|^(tile|arrange|organi[sz]e|line up) (all )?(the |my )?(open )?(windows|everything|all|desktop)$/.test(q)) return { cmd: { do: 'tile' }, text: 'Tiling your windows.' };
  if (/^cascade$|^(cascade|stack) (all )?(the |my )?(open )?(windows|everything)$/.test(q)) return { cmd: { do: 'cascade' }, text: 'Stacking your windows.' };
  if (/^(clean( up)?|tidy( up)?|clear) (my |the )?(desktop|screen|windows)$|^(close|quit) (all|everything)( the| my)?( windows| apps)?$/.test(q)) return { cmd: { do: 'close-all' }, text: 'Closing every window.' };
  if (/^(show|go to|take me to|back to) (the |my )?desktop$|^minimi[sz]e (all|everything)( windows)?$|^hide (all|everything)( windows)?$/.test(q)) return { cmd: { do: 'desktop' }, text: 'Here is the desktop.' };
  if (/^(open |show )?spotlight( search)?$/.test(q)) return { cmd: { do: 'spotlight' }, text: 'Opening Spotlight.' };
  if (/^(start |turn on )?(pet mode|robot pet)( on)?$|^(walk around|go for a walk|take a walk)$/.test(q)) return { cmd: { do: 'pet-on' }, text: 'Off I go. Say “stop walking” to bring me back.' };
  if (/^(stop|turn off) (pet mode|robot pet|walking)( around)?$|^pet mode off$|^(sit|come back)( down)?$/.test(q)) return { cmd: { do: 'pet-off' }, text: 'Back in my corner.' };

  // "put projects next to skills", "projects and skills side by side"
  m = q.match(/^(?:put|place|show|open|move|compare) (.+?) (?:next to|beside|and|with) (.+?)(?: side by side)?$/) ?? q.match(/^(.+?) (?:and|next to|beside) (.+?) side by side$/);
  if (m && (/side by side|next to|beside/.test(q) || /^compare /.test(q))) {
    const a = appNamed(m[1]), b = appNamed(m[2]);
    if (a && b && a !== b) return { cmd: { do: 'side', app: a, other: b }, text: `${title(a)} and ${title(b)}, side by side.` };
  }
  m = q.match(/^(?:put|move|snap|dock) (.+?) (?:to |on )?(?:the )?(left|right)(?: side| half)?$/);
  if (m) {
    const self = /^(this|it|this window|the window)$/.test(m[1]);
    const a = self ? null : appNamed(m[1]);
    if (a || self) return { cmd: { do: 'snap', app: a, to: m[2] as 'left' | 'right' }, text: `Moving ${a ? title(a) : 'this window'} to the ${m[2]}.` };
  }
  m = q.match(/^(close|quit|minimi[sz]e|maximi[sz]e|full ?screen|hide|enlarge) (.+)$/);
  if (m && !/chat|panel/.test(m[2])) {
    const self = /^(this|it|this window|the window|window|this app)$/.test(m[2]);
    const a = self ? null : appNamed(m[2]);
    if (a || self) {
      const act = /^(close|quit)/.test(m[1]) ? 'close' as const : /^(min|hide)/.test(m[1]) ? 'minimise' as const : 'maximise' as const;
      return { cmd: { do: act, app: a }, text: `${{ close: 'Closing', minimise: 'Minimising', maximise: 'Maximising' }[act]} ${a ? title(a) : 'this window'}.` };
    }
  }
  m = q.match(/^(?:open|launch|start|show|show me|go to|run|bring up) (.+)$/);
  if (m) {
    const a = appNamed(m[1]);
    // the sections have their own spoken introductions
    if (a && ['terminal', 'games', 'monitor', 'resume', 'guestbook', 'files'].includes(a)) return { cmd: { do: 'open', app: a }, text: `Opening ${title(a)}.` };
  }
  return null;
}
