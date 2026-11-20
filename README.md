# Kishore.OS

**My portfolio, built as a tiny operating system in the browser — with ALPHA, a talking robot guide.**

🔗 **Live:** <https://kishore-os.web.app>

I'm **Kishore V**, a Java Full Stack Developer (Java 21 · Spring Boot · Hibernate · Angular) from Chennai with 3+ years of experience, currently building the 75Health cloud EHR and EMR platforms at Kaaspro Enterprises.

## What's inside

- **Desktop OS** — draggable, resizable windows (View Transitions API), a magnifying dock, menu bar with live IST clock, `Ctrl/⌘ + K` Spotlight search across apps, projects, skills and 84 study chapters.
- **ALPHA, the voice guide** — a mini robot that talks (Web Speech API), answers questions with **Gemini via Firebase AI Logic** (falls back to an offline brain), takes voice questions, runs a narrated tour, explains every window, and has 18 reactions — poke its face, tummy, head, hands or ears; it even falls asleep if you leave it alone.
- **Apps** — About, Projects, Experience, Skills, Study Notes (Java full-stack + DSA interview prep), Terminal (20+ commands — try `alpha`), Contact (EmailJS), Arcade (two mini-games), System Monitor, Guestbook (live Firestore sticky-note wall), Resume viewer.
- **Aurora wallpaper** — a three.js GLSL shader that ripples while ALPHA speaks.
- Works on phones as a home screen; respects reduced-motion; day & night themes.

## Tech

Angular 22 (standalone, signals, zoneless) · TypeScript · three.js · Web Speech API · Firebase (Hosting, Firestore, AI Logic + App Check) · EmailJS

## Run locally

```bash
npm install
npm start          # http://localhost:4500
```

## Deploy

```bash
npm run deploy     # ng build + firebase deploy (hosting + firestore rules)
```

Pushes to `main` also deploy automatically via GitHub Actions (see `.github/workflows`).
Firebase setup steps: [FIREBASE_SETUP.md](FIREBASE_SETUP.md) · How everything was built: [RND.md](RND.md).

## Contact

📧 kishorebe1199@gmail.com · 💼 [LinkedIn](https://www.linkedin.com/in/kishore-v-a64b2417b/) · 🐙 [GitHub](https://github.com/Kishore1199)
