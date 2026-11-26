import { Injectable, computed, signal } from '@angular/core';
import { SectionId } from './assistant.bus';

export type Lang = 'en' | 'ta' | 'hi' | 'te' | 'ml';
export const LANGS: { id: Lang; label: string; name: string; speech: string }[] = [
  { id: 'en', label: 'English', name: 'English', speech: 'en-IN' },
  { id: 'ta', label: 'தமிழ்', name: 'Tamil', speech: 'ta-IN' },
  { id: 'hi', label: 'हिन्दी', name: 'Hindi', speech: 'hi-IN' },
  { id: 'te', label: 'తెలుగు', name: 'Telugu', speech: 'te-IN' },
  { id: 'ml', label: 'മലയാളം', name: 'Malayalam', speech: 'ml-IN' },
];
const KEY = 'kv-lang';

/** Voice language from the script of the text itself. */
export const speechLang = (text: string): string | null =>
  /[\u0B80-\u0BFF]/.test(text) ? 'ta-IN'
  : /[\u0900-\u097F]/.test(text) ? 'hi-IN'
  : /[\u0C00-\u0C7F]/.test(text) ? 'te-IN'
  : /[\u0D00-\u0D7F]/.test(text) ? 'ml-IN'
  : null;

/** Short section texts for when Gemini can't write them. Please have a native speaker check these. */
const LOCAL: Record<Exclude<Lang, 'en'>, Partial<Record<SectionId, string>>> = {
  ta: {
    home: 'இது கிஷோர் வி. அவர் சென்னையைச் சேர்ந்த ஜாவா ஃபுல் ஸ்டாக் டெவலப்பர். ஸ்பிரிங் பூட், ஆங்குலர் மற்றும் ஹைபர்னேட் பயன்படுத்தி இணையப் பயன்பாடுகளை உருவாக்குகிறார்.',
    about: 'இந்தப் பகுதியில் கிஷோரைப் பற்றியும் அவருடைய பலங்களைப் பற்றியும் அறியலாம்.',
    skills: 'இவை கிஷோரின் திறன்கள். ஜாவா, ஸ்பிரிங் பூட், ஆங்குலர், மைஎஸ்கியூஎல் ஆகியவை முக்கியமானவை.',
    projects: 'இவை கிஷோரின் திட்டங்கள். 75Health EHR மற்றும் 75Health EMR ஆகியவை முக்கியமானவை.',
    experience: 'இது கிஷோரின் பணி அனுபவம். அவர் தற்போது காஸ்ப்ரோ எண்டர்பிரைசஸ் நிறுவனத்தில் பணிபுரிகிறார்.',
    education: 'இது கிஷோரின் கல்வி. அவர் இயந்திரப் பொறியியலில் பட்டம் பெற்றவர்.',
    prep: 'இவை நேர்காணலுக்கான குறிப்புகள். ஜாவா மற்றும் டி.எஸ்.ஏ. பகுதிகள் உள்ளன.',
    ai: 'இந்தத் தளத்தில் உள்ள அனைத்து ஏஐ வசதிகளும் இங்கே உள்ளன.',
    contact: 'கிஷோரைத் தொடர்புகொள்ள இந்தப் படிவத்தைப் பயன்படுத்துங்கள்.',
  },
  hi: {
    home: 'ये किशोर वी हैं। वे चेन्नई के जावा फुल स्टैक डेवलपर हैं और स्प्रिंग बूट, एंगुलर तथा हाइबरनेट से वेब एप्लिकेशन बनाते हैं।',
    about: 'इस भाग में किशोर और उनकी खूबियों के बारे में जानकारी है।',
    skills: 'ये किशोर के कौशल हैं। इनमें जावा, स्प्रिंग बूट, एंगुलर और माईएसक्यूएल प्रमुख हैं।',
    projects: 'ये किशोर के प्रोजेक्ट हैं। 75Health EHR और 75Health EMR इनमें प्रमुख हैं।',
    experience: 'यह किशोर का कार्य अनुभव है। वे अभी कासप्रो एंटरप्राइजेज में काम करते हैं।',
    education: 'यह किशोर की शिक्षा है। उनके पास मैकेनिकल इंजीनियरिंग की डिग्री है।',
    prep: 'ये इंटरव्यू की तैयारी के नोट्स हैं। इनमें जावा और डीएसए के विषय हैं।',
    ai: 'इस साइट की सभी एआई सुविधाएँ यहाँ दी गई हैं।',
    contact: 'किशोर से संपर्क करने के लिए इस फ़ॉर्म का उपयोग करें।',
  },
  te: {
    home: 'ఇది కిషోర్ వి. ఆయన చెన్నైకి చెందిన జావా ఫుల్ స్టాక్ డెవలపర్. స్ప్రింగ్ బూట్, యాంగ్యులర్ మరియు హైబర్నేట్‌తో వెబ్ అప్లికేషన్లు తయారు చేస్తారు.',
    about: 'ఈ విభాగంలో కిషోర్ గురించి మరియు ఆయన బలాల గురించి తెలుసుకోవచ్చు.',
    skills: 'ఇవి కిషోర్ నైపుణ్యాలు. జావా, స్ప్రింగ్ బూట్, యాంగ్యులర్, మైఎస్‌క్యూఎల్ ముఖ్యమైనవి.',
    projects: 'ఇవి కిషోర్ ప్రాజెక్టులు. 75Health EHR మరియు 75Health EMR ముఖ్యమైనవి.',
    experience: 'ఇది కిషోర్ పని అనుభవం. ఆయన ప్రస్తుతం కాస్‌ప్రో ఎంటర్‌ప్రైజెస్‌లో పనిచేస్తున్నారు.',
    education: 'ఇది కిషోర్ విద్యార్హత. ఆయన మెకానికల్ ఇంజనీరింగ్‌లో డిగ్రీ పొందారు.',
    prep: 'ఇవి ఇంటర్వ్యూ సన్నాహక నోట్స్. ఇందులో జావా మరియు డీఎస్ఏ అంశాలు ఉన్నాయి.',
    ai: 'ఈ సైట్‌లోని అన్ని ఏఐ సౌకర్యాలు ఇక్కడ ఉన్నాయి.',
    contact: 'కిషోర్‌ను సంప్రదించడానికి ఈ ఫారమ్‌ను ఉపయోగించండి.',
  },
  ml: {
    home: 'ഇത് കിഷോർ വി. ചെന്നൈയിൽ നിന്നുള്ള ജാവ ഫുൾ സ്റ്റാക്ക് ഡെവലപ്പറാണ് അദ്ദേഹം. സ്പ്രിംഗ് ബൂട്ട്, ആംഗുലർ, ഹൈബർനേറ്റ് എന്നിവ ഉപയോഗിച്ച് വെബ് ആപ്ലിക്കേഷനുകൾ നിർമ്മിക്കുന്നു.',
    about: 'ഈ ഭാഗത്ത് കിഷോറിനെക്കുറിച്ചും അദ്ദേഹത്തിന്റെ കഴിവുകളെക്കുറിച്ചും അറിയാം.',
    skills: 'ഇവയാണ് കിഷോറിന്റെ കഴിവുകൾ. ജാവ, സ്പ്രിംഗ് ബൂട്ട്, ആംഗുലർ, മൈഎസ്‌ക്യുഎൽ എന്നിവ പ്രധാനമാണ്.',
    projects: 'ഇവയാണ് കിഷോറിന്റെ പ്രോജക്റ്റുകൾ. 75Health EHR, 75Health EMR എന്നിവ പ്രധാനമാണ്.',
    experience: 'ഇത് കിഷോറിന്റെ തൊഴിൽ പരിചയമാണ്. അദ്ദേഹം ഇപ്പോൾ കാസ്‌പ്രോ എന്റർപ്രൈസസിൽ ജോലി ചെയ്യുന്നു.',
    education: 'ഇത് കിഷോറിന്റെ വിദ്യാഭ്യാസമാണ്. അദ്ദേഹം മെക്കാനിക്കൽ എഞ്ചിനീയറിംഗിൽ ബിരുദം നേടിയിട്ടുണ്ട്.',
    prep: 'ഇവ ഇന്റർവ്യൂ തയ്യാറെടുപ്പ് കുറിപ്പുകളാണ്. ജാവ, ഡിഎസ്എ വിഷയങ്ങൾ ഇതിലുണ്ട്.',
    ai: 'ഈ സൈറ്റിലെ എല്ലാ എഐ സൗകര്യങ്ങളും ഇവിടെയുണ്ട്.',
    contact: 'കിഷോറിനെ ബന്ധപ്പെടാൻ ഈ ഫോം ഉപയോഗിക്കുക.',
  },
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly lang = signal<Lang>(this.load());
  readonly info = computed(() => LANGS.find(l => l.id === this.lang())!);

  set(v: string) {
    const l = LANGS.find(x => x.id === v)?.id ?? 'en';
    this.lang.set(l);
    try { localStorage.setItem(KEY, l); } catch { /* storage unavailable */ }
  }

  /** Extra instruction for the AI, or an empty string. */
  note(): string {
    return this.lang() === 'en' ? '' : `[Reply in ${this.info().name}, in its own script. Keep names of people, companies, products and technologies as they are. Tool arguments that are spoken or shown, such as tour narration, must be in ${this.info().name} too.]`;
  }

  /** A ready-made text for a section, or null. */
  section(id: SectionId | undefined): string | null {
    const l = this.lang();
    return l === 'en' || !id ? null : (LOCAL[l][id] ?? null);
  }

  private load(): Lang {
    try { return LANGS.find(l => l.id === localStorage.getItem(KEY))?.id ?? 'en'; } catch { return 'en'; }
  }
}
