# Connecting Kishore.OS to Firebase

Three things run on Firebase — all on the **free Spark plan** (no credit card):

| Feature | Firebase product | What it does |
|---|---|---|
| ALPHA's real AI answers | **AI Logic** (Gemini Developer API) | ALPHA answers any question about you in natural language, then speaks it |
| Guestbook | **Cloud Firestore** | Visitors pin sticky notes on a shared wall, live for everyone |
| Live website | **Hosting** | `https://<your-project>.web.app` (+ your own domain if you want) |

Until you finish these steps the site still works: ALPHA uses its offline answers and the Guestbook says "not connected yet".

---

## 1. Create the project (2 min)
1. Open <https://console.firebase.google.com> → **Create a project** → name it e.g. `kishore-os`.
2. Google Analytics: optional (you can turn it off).

## 2. Register the web app → copy the config
1. Project overview → click the **`</>` (Web)** icon → nickname `Kishore.OS` → tick **"Also set up Firebase Hosting"** → Register.
2. Firebase shows a `firebaseConfig = { apiKey: …, authDomain: …, projectId: …, … }` block.
3. Paste those six values into **`src/app/core/firebase.config.ts`** → `FIREBASE_CONFIG`.
   *(These values are public by design — security comes from the rules and App Check below.)*
4. Put your project ID into **`.firebaserc`** (replace `YOUR-FIREBASE-PROJECT-ID`).

## 3. Turn on the Guestbook database
1. **Build → Firestore Database → Create database**.
2. Location: **`asia-south1` (Mumbai)** — closest to Chennai. (Cannot be changed later.)
3. Start in **production mode**. The real rules are in `firestore.rules` and get deployed in step 7.

## 4. Turn on Gemini for ALPHA
1. **AI Services → AI Logic → Get started**.
2. Choose **Gemini Developer API** (the free one) and follow the guided steps.
3. The model name is set in `firebase.config.ts` → `GEMINI_MODEL` (`gemini-4-hydrogen`, free tier). Google retires models over time — if ALPHA falls back to offline answers one day, check <https://firebase.google.com/docs/ai-logic/models> and update the name.

## 5. App Check (required for Gemini)
Firebase now **enforces App Check** for AI Logic — it proves requests come from *your* site, so nobody can drain your free quota.
1. **Security → App Check → Apps** → your web app → **reCAPTCHA Enterprise** → create a **score-based** key (not the checkbox type).
2. Allowed domains: `<project-id>.web.app`, `<project-id>.firebaseapp.com` (and your custom domain later). **Don't add `localhost`.**
3. Copy the site key into `firebase.config.ts` → `RECAPTCHA_ENTERPRISE_KEY`.

### Testing on localhost
1. Run `npm start`, open <http://localhost:4500>, open DevTools → Console.
2. Ask ALPHA something — the console prints **"App Check debug token: xxxx-…"**.
3. Firebase console → App Check → Apps → ⋮ → **Manage debug tokens** → add that token.
4. Ask again — now Gemini answers. (Chat header shows **"Gemini AI"**.)

## 6. Install the Firebase CLI & log in
In this Claude Code session type (the `!` runs it here):
```
! npx firebase-tools login
```
A browser window opens — sign in with the Google account that owns the project.

## 7. Deploy 🚀
```
npm run deploy
```
This builds the site and deploys **Hosting + Firestore rules**. Your site is live at
`https://<project-id>.web.app`.

### Custom domain (optional)
Hosting → **Add custom domain** → follow the DNS steps (TXT + A records at your domain provider). Then add the domain to the reCAPTCHA key's allowed domains (step 5).

---

## Moderating the guestbook
Notes can't be edited or deleted from the site. To remove spam: Firestore → `guestbook` collection → delete the document.
Built-in protections: name 2–40 chars, message 3–240 chars, fixed colour list, server timestamp, one note per minute per browser.

## Free-tier limits (check the Firebase pricing page for current numbers)
- Hosting, Firestore and the Gemini Developer API all have daily free quotas on Spark — far more than a portfolio needs.
- Gemini default limit: 100 requests per minute per user.
- If you ever exceed a quota, ALPHA automatically falls back to its offline answers; nothing breaks.
