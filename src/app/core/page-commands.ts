/** Saying or typing what the page should do. No AI. */
export type PageCmd = 'down' | 'up' | 'top' | 'bottom' | 'next-section' | 'prev-section' | 'next-project' | 'prev-project' | 'pause-slides' | 'play-slides' | 'dark' | 'light' | 'mute' | 'unmute' | 'close-chat';

const CMDS: [RegExp, PageCmd, string][] = [
  [/^(scroll|go|page|move)( a (bit|little))? down$|^down$/, 'down', 'Scrolling down.'],
  [/^(scroll|go|page|move)( a (bit|little))? up$|^up$/, 'up', 'Scrolling up.'],
  [/^(scroll |go |back )?(to )?(the )?(top|beginning)( of the page)?$/, 'top', 'Back to the top.'],
  [/^(scroll |go )?(to )?(the )?(bottom|end)( of the page)?$/, 'bottom', 'Down to the end.'],
  [/^(go to )?(the )?next section$/, 'next-section', 'Next section.'],
  [/^(go to )?(the )?(previous|last|prev) section$/, 'prev-section', 'Previous section.'],
  [/^(show )?(the )?next (project|slide)$/, 'next-project', 'Next project.'],
  [/^(show )?(the )?(previous|prev) (project|slide)$/, 'prev-project', 'Previous project.'],
  [/^(pause|stop) (the )?(slideshow|slides|slider|projects)$/, 'pause-slides', 'Slideshow paused.'],
  [/^(play|start|resume) (the )?(slideshow|slides|slider)$/, 'play-slides', 'Slideshow playing.'],
  [/^(turn on |switch to |use |change to |make it |go )?(the )?dark( mode| theme)?$/, 'dark', 'Lights off.'],
  [/^(turn on |switch to |use |change to |make it |go )?(the )?light( mode| theme)?$/, 'light', 'Lights on.'],
  [/^mute( yourself)?$|^(turn off|no) (sound|voice)$/, 'mute', 'Muted.'],
  [/^unmute( yourself)?$|^(turn on|use) (the )?(sound|voice)$/, 'unmute', 'My voice is on.'],
  [/^(close|hide) (the )?(chat|window|panel)$/, 'close-chat', 'Closing the chat.'],
];

export function pageCommand(raw: string): { cmd: PageCmd; text: string } | null {
  const q = raw.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(hey |ok )?alpha /, '').replace(/^please /, '').replace(/ please$/, '');
  const hit = CMDS.find(([r]) => r.test(q));
  return hit ? { cmd: hit[1], text: hit[2] } : null;
}
