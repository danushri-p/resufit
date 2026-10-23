# ResuFit: project summary

**Live site:** https://resufit-one.vercel.app · **Code:** https://github.com/danushri-p/resufit

## The problem

Job seekers tailor the same resume to many jobs. AI tools can help, but they tend to invent experience, metrics, and skills, which can get a candidate rejected or put them in an awkward interview. ResuFit helps people tailor their application **using only what is actually true about them**, and shows them how to close the gaps honestly.

## What it does

1. **Analyze:** upload a resume (PDF/DOCX) and paste a job description. ResuFit extracts both with AI, then computes a deterministic match score and a rule-based ATS check.
2. **Improve:** honest suggestions, guarded bullet rewrites, a tailored one-column resume (PDF or text), a cover letter, and interview prep.
3. **Compare:** rank one resume against up to three jobs and find the skills that would unlock the most of them.
4. **Learn:** turn missing skills into a plan with official documentation and a practice project based on the user's own work.
5. **Apply:** track applications, follow-ups (with calendar export), and response rate.

It is an installable web app that works offline for browser-stored features, supports dark mode, and keeps all personal data in the user's browser with backup, restore, and delete controls.

## Key design decisions

| Decision | Why |
| --- | --- |
| **Deterministic scoring, AI only for language tasks** | Scores must be explainable and repeatable; AI is used to read documents and write text, never to judge the candidate. |
| **Honesty guards in code, not just prompts** | Small models ignored "don't invent numbers" instructions in testing. Every generated sentence is checked against the resume (numbers, missing skills, technologies, project and company names) and dropped or retried if it fails. |
| **Data stays in the browser** | No accounts or database: history, tracker, and learning progress live in `localStorage`, with Zod validation on read, plus backup, restore, and delete-all. |
| **Two AI providers** | Ollama for free local development; Google Gemini for the deployed site, with model fallback, caching, and per-IP limits to survive the free tier. |
| **Accessibility as a test, not a review** | axe-core runs on every page in light and dark mode in CI, with 375px mobile-width checks. |

## Real problems solved along the way

- **PDF upload crashed only on Vercel.** `pdf-parse` 2.x needs its worker entry imported on serverless platforms; diagnosed from an empty 500 response and fixed with one import.
- **Free-tier quota and retired models.** One Analyze went from 3 Gemini requests to 2, results are cached, and the app falls back to other models on rate limits, overloads (5xx), and models Google had retired (404).
- **AI inventing facts.** Rewrites changed "15+ APIs" to "20+", claimed technologies a project never used, and attributed features to the wrong tool. Each case became a code-level guard and a regression test.
- **CI failed with "lock file out of sync".** Different npm versions disagreed about two optional packages; fixed permanently by declaring them explicitly.
- **Security advisories.** A built-in Next.js check flagged two critical vulnerabilities in the deployed version, so Next.js was patched (16.4.0 → 16.4.2); later the test runner was upgraded (Vitest 3 → 5), which also exposed a test that had silently never run.
- **Accessibility regressions caught by tests.** A logo colour (3.52:1 contrast), dim text in dark mode, and a header that overflowed on phones were all caught by automated checks before release.

## Quality

- **173 unit tests** (Vitest) and **59 end-to-end tests** (Playwright), including accessibility scans in light and dark mode, offline/service-worker tests, and mobile-width checks.
- CI runs lint, unit tests, a production build, and the full browser suite on every pull request (GitHub Actions, Node.js 24); every feature shipped through a reviewed pull request over 18 days.
- No production vulnerabilities in `npm audit --omit=dev`.

## Tech stack

Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4, Zod, Google Gemini / Ollama, `pdf-parse`, `mammoth`, Vitest, Playwright, axe-core, Vercel, GitHub Actions.

## Demo script (about 3 minutes)

1. Open the live site, show the landing page and privacy note.
2. **Try a sample** → **Analyze**: walk through the score, missing skills, and ATS check.
3. **Improve bullets**: compare original and improved wording; any bullet marked "Kept as is" was rejected by the honesty checks.
4. **Build tailored resume** → toggle one bullet between original and improved → **Save as PDF**.
5. **Make a learning plan** → mark a skill as Learning.
6. **Track this application** → open the tracker, set a follow-up, **Add to calendar**.
7. Switch to **Dark** at the bottom of the page; mention offline support and **Your data** (backup, restore, delete).
