# ResuFit

ResuFit is an AI resume analyzer built with Next.js, TypeScript, and Tailwind CSS. Day 1 provides resume text extraction and a job-description input; analysis will be added later.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then choose **Try it** to open the analyzer.

## Day 1 features

- Upload a PDF or DOCX resume up to 5 MB on `/analyze`.
- Preview the extracted text and word count.
- Paste a job description. The Analyze button is intentionally disabled for now.

The `POST /api/resume` endpoint accepts a `file` field in `FormData` and returns the filename, extracted text, and word count. It reports errors for unsupported files, oversized uploads, and files with no extractable text.
