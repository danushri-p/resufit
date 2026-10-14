"use client";

import { useState } from "react";
import { UploadBox, type ResumeUploadResult } from "@/components/UploadBox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  JobRequirementsSchema,
  ResumeSchema,
  type JobRequirements,
  type Resume,
} from "@/lib/schemas";

const MIN_JOB_TEXT_LENGTH = 50;

interface ExtractionResult {
  resume: Resume;
  job: JobRequirements;
}

function getApiError(value: unknown): string | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return undefined;
}

function parseExtractionResult(value: unknown): ExtractionResult | undefined {
  if (typeof value !== "object" || value === null || !("resume" in value) || !("job" in value)) {
    return undefined;
  }

  const resume = ResumeSchema.safeParse(value.resume);
  const job = JobRequirementsSchema.safeParse(value.job);

  if (!resume.success || !job.success) {
    return undefined;
  }

  return { resume: resume.data, job: job.data };
}

function SkillChips({ skills }: { skills: string[] }) {
  if (skills.length === 0) {
    return <p className="text-sm text-stone-500">None listed.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <li
          key={skill}
          className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-800"
        >
          {skill}
        </li>
      ))}
    </ul>
  );
}

export default function AnalyzePage() {
  const [resume, setResume] = useState<ResumeUploadResult>();
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState<ExtractionResult>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>();

  const canAnalyze =
    Boolean(resume?.text.trim()) &&
    jobText.trim().length >= MIN_JOB_TEXT_LENGTH &&
    !isAnalyzing;

  function handleResumeExtracted(upload: ResumeUploadResult) {
    setResume(upload);
    setResult(undefined);
    setError(undefined);
  }

  async function handleAnalyze() {
    if (!canAnalyze || !resume) {
      return;
    }

    setIsAnalyzing(true);
    setResult(undefined);
    setError(undefined);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resume.text,
          jobText: jobText.trim(),
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          getApiError(payload) ?? "Could not analyze the resume and job description.",
        );
      }

      const parsedResult = parseExtractionResult(payload);
      if (!parsedResult) {
        throw new Error("The server returned results in an unexpected format.");
      }

      setResult(parsedResult);
    } catch (analyzeError) {
      setError(
        analyzeError instanceof Error
          ? analyzeError.message
          : "Could not analyze the resume and job description. Please try again.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            Analyze your resume
          </h1>
          <p className="text-stone-600">
            Upload your resume and add the job description you have in mind.
          </p>
        </header>

        <UploadBox onTextExtracted={handleResumeExtracted} />

        <Card>
          <CardHeader>
            <CardTitle>Extracted resume text</CardTitle>
            <CardDescription>
              {resume
                ? `${resume.fileName} · ${resume.wordCount} words`
                : "Your resume text will appear here after upload."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre
              aria-live="polite"
              className="max-h-80 min-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-stone-100 p-4 font-sans text-sm leading-6 text-stone-800"
            >
              {resume?.text ?? "No resume text to preview yet."}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job description</CardTitle>
            <CardDescription>
              Paste at least {MIN_JOB_TEXT_LENGTH} characters to enable analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={jobText}
              onChange={(event) => {
                setJobText(event.target.value);
                setResult(undefined);
                setError(undefined);
              }}
              placeholder="Paste the job description here..."
              rows={8}
              aria-label="Job description"
              aria-describedby="job-description-length"
            />
            <p
              id="job-description-length"
              className="text-sm text-stone-500"
              aria-live="polite"
            >
              {jobText.trim().length}/{MIN_JOB_TEXT_LENGTH} characters minimum
            </p>
            <Button
              type="button"
              disabled={!canAnalyze}
              onClick={() => void handleAnalyze()}
            >
              {isAnalyzing ? "Analyzing…" : "Analyze"}
            </Button>
            {isAnalyzing && (
              <p className="text-sm text-indigo-700" role="status">
                Extracting structured details from both documents…
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        {result && (
          <section aria-label="Analysis results" className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Your resume</CardTitle>
                <CardDescription>
                  {result.resume.name ?? resume?.fileName}
                  {result.resume.email ? ` · ${result.resume.email}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {result.resume.summary && (
                  <p className="text-sm leading-6 text-stone-700">
                    {result.resume.summary}
                  </p>
                )}
                <div className="space-y-2">
                  <h3 className="font-medium text-stone-900">Skills</h3>
                  <SkillChips skills={result.resume.skills} />
                </div>
                <div className="space-y-3">
                  <h3 className="font-medium text-stone-900">Experience</h3>
                  {result.resume.experience.length > 0 ? (
                    <ul className="space-y-4">
                      {result.resume.experience.map((experience, index) => (
                        <li
                          key={`${experience.role ?? "role"}-${experience.company ?? "company"}-${index}`}
                          className="space-y-1 border-l-2 border-indigo-200 pl-4"
                        >
                          <p className="font-medium text-stone-900">
                            {[experience.role, experience.company]
                              .filter(Boolean)
                              .join(" · ") || "Experience"}
                          </p>
                          {(experience.startDate || experience.endDate) && (
                            <p className="text-sm text-stone-500">
                              {[experience.startDate, experience.endDate]
                                .filter(Boolean)
                                .join(" – ")}
                            </p>
                          )}
                          {experience.bullets.length > 0 && (
                            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
                              {experience.bullets.map((bullet, bulletIndex) => (
                                <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-stone-500">
                      No experience entries were found.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job requirements</CardTitle>
                <CardDescription>
                  {result.job.jobTitle ?? "Job title not specified"}
                  {result.job.company ? ` · ${result.job.company}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {result.job.yearsOfExperience !== null && (
                  <p className="text-sm text-stone-700">
                    Experience: {result.job.yearsOfExperience} years
                  </p>
                )}
                <div className="space-y-2">
                  <h3 className="font-medium text-stone-900">
                    Must-have skills
                  </h3>
                  <SkillChips skills={result.job.mustHaveSkills} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-stone-900">
                    Nice-to-have skills
                  </h3>
                  <SkillChips skills={result.job.niceToHaveSkills} />
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
