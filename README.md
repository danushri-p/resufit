# ResuFit

ResuFit compares a resume with a job description and gives an honest match score, ATS checks, suggestions, and bullet rewrites.

[Live demo](https://resufit-one.vercel.app) · [![CI](https://github.com/danushri-p/resufit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/danushri-p/resufit/actions/workflows/ci.yml)

## Screenshots

Add screenshots at:

- `docs/screenshots/analyze.png`
- `docs/screenshots/results.png`
- `docs/screenshots/history.png`

## Features

- Upload and preview PDF or DOCX resumes (up to 5 MB), or try fictional sample data.
- Compare resume skills and experience against a job with a deterministic match score.
- Review tailored suggestions and ATS checks.
- Rewrite project bullets with checks against unsupported facts and technologies.
- Download a Markdown report.
- Keep up to ten recent analyses in browser-local history.

## Privacy

Your resume is sent to the AI provider to generate the analysis and is not stored by ResuFit. On the live site the provider is Google Gemini; on the free tier Google may use submitted content to improve its products, so avoid uploading information you don't want to share. Saved history stays in this browser.

## How it works

`upload → extract → match → suggest → rewrite`

Resume and job details are extracted by the selected AI provider and validated with Zod. Skill/experience scoring and ATS checks are deterministic; suggestions and rewrites use AI.

## Tech stack

Next.js, TypeScript, Tailwind CSS, Zod, Vitest, Ollama or Google Gemini, `pdf-parse`, and `mammoth`.

## Honesty safeguards

- **Number guard:** rejects rewrite metrics/numbers that are not supported by the original bullet.
- **Missing-skill guard:** rejects rewrites and suggestions that claim a skill listed as missing, except when a rewrite retains a claim already present in its original bullet.
- **Technology guard:** limits rewritten technologies to those already named in the bullet or project tech stack.
- **Deterministic results:** match score and ATS checks are rule-based and do not use AI.

## Run locally

Install dependencies with `npm ci`. For local Ollama, install Ollama and run:

```bash
ollama run llama3.2
npm run dev
```

For Gemini, create a key in [Google AI Studio](https://aistudio.google.com/apikey) and set `AI_PROVIDER=gemini` and `GEMINI_API_KEY` in `.env.local`. The default model is `gemini-2.5-flash`; if it is rate limited, ResuFit tries the configured fallback models (default: `gemini-2.5-flash-lite`).

Open [http://localhost:3000](http://localhost:3000). Copy `.env.example` to `.env.local` to customize settings.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_PROVIDER` | `ollama` | Select `ollama` or `gemini`. |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Local Ollama server URL. |
| `OLLAMA_MODEL` | `llama3.2` | Local Ollama model. |
| `GEMINI_API_KEY` | *(empty)* | Required when using Gemini; keep secret. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model. |
| `GEMINI_FALLBACK_MODELS` | `gemini-2.5-flash-lite` | Comma-separated Gemini models tried when the primary model hits a rate limit. |
| `NEXT_PUBLIC_AI_PROVIDER_LABEL` | `Ollama (local)` | Non-secret provider label shown in the footer. |

## Tests

```bash
npm run lint
npm test
npm run build
```

The test suite mocks AI network requests. CI runs these checks on Node.js 22.

## Deploy to Vercel

Import the GitHub repository in Vercel, set `AI_PROVIDER=gemini` and `GEMINI_API_KEY` in project environment variables, optionally set `GEMINI_FALLBACK_MODELS` and `NEXT_PUBLIC_AI_PROVIDER_LABEL=Gemini`, and deploy. Analyze normally uses 2 Gemini requests (one combined resume/job extraction and one suggestions request); Improve bullets normally uses 1. A rate-limit fallback can add model requests. Never expose the API key with a `NEXT_PUBLIC_` prefix.

## Limitations

- The free Gemini tier has rate limits per Google project. Fallback models have their own model quotas, but all models still share the project's overall limits. Use different keys/projects for local testing and the live site if both are used heavily.
- Analyze normally uses 2 Gemini requests (combined resume/job extraction and suggestions); Improve bullets normally uses 1. A rate-limit fallback can add model requests. ResuFit caches successful AI results in memory for up to one hour per serverless instance, so cache hits are not shared between instances.
- The app also uses a basic in-memory per-IP request limit.
- Small local models may be less accurate than hosted models.
- Scanned/image-only PDFs are not supported; the PDF must contain selectable text.
- Analysis history is stored per browser and is not shared across browsers or devices.

## Project timeline

- **Day 1:** Set up the app and resume upload/preview flow.
- **Day 2:** Extract structured resume and job details.
- **Day 3:** Add match scoring and suggestions.
- **Day 4:** Add guarded bullet rewrites and Markdown reports.
- **Day 5:** Add ATS checks and browser-local history.
- **Day 6:** Add Gemini, deployment configuration, and public-site safeguards.
- **Day 7:** Polish sample flow, landing page, error states, metadata, and CI.


