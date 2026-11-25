/**
 * Everyday things people say to a robot. Answered at once, without AI, and never with a study note.
 * Only whole messages match, so "are you there" is small talk but "are you there any Kafka notes" is not.
 */
const HELP = 'You can ask about Kishore’s projects, skills and experience, match a job description, start a mock interview, or say “start the tour”.';

/** Half a sentence, usually because the microphone stopped early. */
const FRAGMENT = /^(are|r|you|u|the|a|an|is|am|was|were|do|does|did|can|could|will|would|what|how|who|when|where|which|whose|i|me|my|we|it|its|to|of|in|on|for|and|but|or|so|if|then|there|here|this|that|these|those|with|from|at|by|as|please|tell|say|give|show|have|has|had)( (are|you|the|a|is|do|can|to|of|i|me|my|it|about|there|this|that))?$/;

const RULES: [RegExp, string | string[] | (() => string)][] = [
  [/^(are you|r u|you|u|anyone|anybody|is anyone|is anybody|is (there )?(any ?one|any ?body|someone))( still)?( out)? ?there$|^is there (any ?one|any ?body|someone)$|^(are )?you (here|online|awake|alive|working|with me|listening|available|ready)$|^(can|do|could) you (hear|see|understand) me$|^hear me$/, [`Yes, I'm here and listening. What would you like to know about Kishore?`, `Right here! I can hear you fine.`, `Always here for you. What shall we talk about?`, `Yes! I was just polishing my antennae. What's up?`]],
  [/^how (are|r) (you|u)( doing)?( today| now)?$|^how('s| is) it going$|^(are )?you (ok|okay|fine|good|well|alright)$|^what'?s up$|^sup$|^how do you feel$|^how have you been$/, [`I'm doing great, thank you! How are you?`, `All my circuits are happy today. And you?`, `Feeling fully charged! How about you?`]],
  [/^(hi |hello |hey |ok |okay )?(alpha|alfa|alpa)$/, `Yes? I'm listening. What would you like to know?`],
  [/^(hi|hello|hey|hii+|helo|hai|vanakkam|namaste)( there)?$|^good (morning|afternoon|evening|day)$|^greetings$/, () => `${partOfDay()}! I'm Alpha. ${HELP}`],
  [/^good ?night$/, 'Good night! Come back any time.'],
  [/^(who|what) (are|r) (you|u)$|^what('s| is) your name$|^your name$|^(please )?introduce your ?self$|^tell me about your ?self$|^who is alpha$|^what is alpha$/, `I'm Alpha, the assistant on Kishore's portfolio. ${HELP}`],
  [/^(are )?you (a |an )?(real|human|robot|bot|ai|person|machine|chat ?bot|computer)( person| human)?$/, `I'm a robot assistant, not a person. I can tell you about Kishore's work and show you around this site.`],
  [/^what (can|do|could) you do( for me)?$|^help( me)?( please)?$|^(can|could|will) you help( me)?$|^i need (some )?help$|^what (should|can|could) i (ask|say|do)( you)?$|^how (do|can) i use (you|this)$|^what (are )?your (features|abilities)$|^menu$|^options$/, HELP],
  [/^who (made|built|created|designed|developed) (you|u|alpha)$|^who('s| is) your (creator|maker|owner|boss|developer)$/, 'Kishore built me, along with this whole site.'],
  [/^how old are you$|^when (were you|is your) (born|birthday)$|^what is your age$/, `I'm a robot, so I don't have an age. Kishore's experience is easier to count: ask me about it.`],
  [/^where (are|r) (you|u)( from| now)?$|^where do you live$/, 'I live right here, in your browser, on Kishore’s portfolio.'],
  [/^(what are you doing|are you busy|you busy|are you free)( now| right now)?$/, 'Just waiting to help you. Ask me anything about Kishore.'],
  [/^(i am|i'm|im) (also )?(fine|good|ok|okay|great|well|doing (good|great|well|fine))( too)?( thank you| thanks)?$|^(fine|good|great) (too|thanks|thank you)$/, ['Good to hear! What would you like to explore?', 'Lovely! Shall we look at some projects?']],
  [/^(ok|okay|k|kk|alright|fine|cool|nice|great|good|super|awesome|perfect|wow|got it|i see|understood|okay great|ok great|this is (cool|nice|great|awesome|amazing)|that'?s (cool|nice|great|good|awesome|amazing)|(very )?(nice|good) (job|work)|well done)$/, ['Glad to hear it! What would you like to see next?', 'Great! Where shall we go next?', 'Nice. Ask me anything else.']],
  [/^(thanks?|thank (you|u)|ty|thx|tq)( so much| a lot| very much| alpha)?$|^many thanks$/, ["You're welcome! Anything else?", 'Happy to help! What next?', 'Any time!']],
  [/^(yes|yeah|yep|yup|sure|of course)$/, `Great! Tell me what you'd like to see: projects, skills, experience or the tour?`],
  [/^(no|nope|nah|no thanks|no thank you|nothing|not now|never ?mind)$/, `No problem. I'm here if you need me.`],
  [/^(bye|goodbye|good bye|bye bye|see (you|ya)( later| soon)?|cya|take care|talk later)$/, ['Goodbye! Thanks for visiting Kishore’s portfolio.', 'See you soon! I’ll be right here.', 'Bye! It was nice talking with you.']],
  [/^(i (love|like) (you|u)|(you|u) (are|r) (so |very |really )?(cute|nice|great|good|cool|awesome|amazing|smart|beautiful|funny|the best)|(good|nice) (robot|bot|boy|girl))$/, `Aww, thank you! That made my antennae wiggle.`],
  [/^(you|u) (are|r) (so |very |really )?(bad|stupid|dumb|useless|slow|boring|ugly|wrong)$|^why are you (so )?(slow|bad|dumb)$|^(that'?s|this is) (wrong|bad|useless)$/, `I'm sorry about that. Try asking in a different way, or use the contact form to reach Kishore directly.`],
  [/^(sorry|my bad|oops)$/, 'No worries at all. What would you like to know?'],
  [/^(tell me a joke|joke|say something funny|make me laugh|another joke)$/, 'Why do Java developers wear glasses? Because they don’t C sharp!'],
  [/^(say|tell me) something( else)?$/, 'Did you know this site works offline too? Open the AI section and pick “Offline app”.'],
  [/^(sing|dance)( a song)?( for me| please)?$|^(can|do) you (sing|dance|like music)$/, 'I can do a little dance. Tap the bottom of my body!'],
  [/^what('s| is) the time( now)?$|^what time is it( now)?$|^time$/, () => `It's ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} where you are.`],
  [/^what('s| is) (the |today'?s )?(date|day)( today)?$|^what day is (it|today)( today)?$|^what('s| is) today$/, () => `Today is ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`],
  [/^(test|testing|test test|check|mic test|testing 1 2 3|hello test)$/, `I'm working and I can read you. Ask me something about Kishore.`],
  [/^(h+m+|u+h+|u+m+|lol|haha+|hehe+|what|huh|pardon)$/, `I'm listening. ${HELP}`],
  [/^(stop|quiet|be quiet|shut up|silence|enough)$/, 'Okay. Tap me when you need me.'],
  [/^(i have (a|some) (question|questions|doubt)|can i ask (you )?(something|a question)|may i ask( you)?( something| a question)?)$/, 'Of course, go ahead!'],
  [/^what happened$|^what('s| is) wrong$|^why$/, `Nothing is wrong on my side. ${HELP}`],
];

const partOfDay = () => { const h = new Date().getHours(); return h < 5 ? 'Hello' : h >= 17 ? 'Good evening' : h < 12 ? 'Good morning' : 'Good afternoon'; };

const said = new Map<string[], number>();
/** Never the same wording twice in a row. */
function vary(options: string[]): string {
  const i = said.has(options) ? (said.get(options)! + 1) % options.length : 0;
  said.set(options, i);
  return options[i];
}

/** The message without punctuation, or the robot's name at the start or end. */
const tidy = (raw: string) => raw.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function smallTalk(raw: string): string | null {
  let q = tidy(raw);
  const try1 = (t: string) => { const hit = RULES.find(([r]) => r.test(t)); if (!hit) return null; const a = hit[1]; return typeof a === 'string' ? a : typeof a === 'function' ? a() : vary(a); };
  const first = try1(q);
  if (first) return first;
  // "hello alpha are you there", "are you there alpha", "hey, how are you?"
  q = q.replace(/^(please |so |well |and )+/, '').replace(/^(hi|hello|hey|ok|okay)( there)? (?=\S)/, '').replace(/^alpha (?=\S)/, '').replace(/ (alpha|please|bro|buddy|dude|man|sir|friend)$/, '').trim();
  const second = q ? try1(q) : null;
  if (second) return second;
  return FRAGMENT.test(q) ? `I only caught “${q}”. Could you say the whole question again?` : null;
}
