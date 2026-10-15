# ResuFit

ResuFit is a resume analyzer built with Next.js, TypeScript, and Tailwind CSS. Resume and job-description extraction runs locally through Ollama; no AI API key is required.

## Run locally

1. Install Ollama from [ollama.com](https://ollama.com).
2. In a terminal, download and start the model:

   ```bash
   ollama run llama3.2
   ```

   Keep Ollama running while using ResuFit.
3. In another terminal, start the web app:

   ```bash
   npm install
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) and choose **Try it**.

The app uses `http://127.0.0.1:11434` and the `llama3.2` model by default. Set `OLLAMA_BASE_URL` or `OLLAMA_MODEL` in `.env.local` only if you need different values; no API key is needed.

## Features

- Upload a PDF or DOCX resume up to 5 MB on `/analyze`.
- Preview extracted resume text and word count.
- Paste a job description of at least 50 characters.
- Extract structured resume and job details locally; the Analyze button displays skills and experience when Ollama is available.

The `POST /api/resume` endpoint extracts document text. The `POST /api/extract` endpoint returns validated resume and job requirement data.

## Day 3: Match analysis

After extraction, ResuFit compares resume skills (including project tech stacks) with the job's must-have and nice-to-have skills. The match score weights must-have coverage at 70%, nice-to-have coverage at 20%, and experience at 10%. Empty skill lists receive full coverage points. When years of experience are required, each listed experience entry counts as one year and projects count as zero; the score is rounded to a whole number. Ollama generates up to five resume improvement suggestions separately, so suggestion failures do not affect the score.

## Day 4: Bullet rewriting and reports

ResuFit can rewrite project bullets to better match a job while preserving their original facts and project technologies. Unsupported numbers, missing skills, and unverified technologies are rejected, leaving the original bullet unchanged. Download a Markdown report from the match analysis card to save the score, skills, suggestions, and any improved bullets. Run unit tests with `npm test`.
