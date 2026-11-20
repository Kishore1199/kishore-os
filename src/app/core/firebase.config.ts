/**
 * Firebase settings — fill these in after creating your Firebase project (see FIREBASE_SETUP.md).
 * These values are NOT secrets: Firebase web config is meant to ship in the browser.
 * Your data is protected by Firestore security rules and App Check, not by hiding this object.
 *
 * Until `apiKey` is filled in, the site keeps working offline: ALPHA uses its built-in answers
 * and the Guestbook shows a "not connected yet" note.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBXoBeqQY6f0oYbG8HVjYfuBxamN2Z_gKY',
  authDomain: 'kishore-os.firebaseapp.com',
  projectId: 'kishore-os',
  storageBucket: 'kishore-os.firebasestorage.app',
  messagingSenderId: '282403744636',
  appId: '1:282403744636:web:250a031795299ddb96d2f9',
  measurementId: 'G-E3B78VETVK',
};

/** reCAPTCHA Enterprise *score-based* site key, created in Firebase console → App Check. */
export const RECAPTCHA_ENTERPRISE_KEY = '6LehhSouAAAAAEQiGjmibG2OIm0-zqEcbwC2-S0Y';

/**
 * Gemini model used by ALPHA. `gemini-4-hydrogen` is the current stable model that works on the free
 * Spark plan (Nov 2026). Google retires models over time — if answers stop working, check
 * https://firebase.google.com/docs/ai-logic/models and update this name.
 */
export const GEMINI_MODEL = 'gemini-4-hydrogen';

export const firebaseReady = () => !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.projectId;
