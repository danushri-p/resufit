"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ComparisonResults } from "@/components/compare/ComparisonResults";
import { Logo } from "@/components/Logo";
import { UploadBox, type ResumeUploadResult } from "@/components/UploadBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { readApiResponse } from "@/lib/apiResponse";
import { CompareResultSchema, type CompareResult } from "@/lib/schemas";
import { saveHistoryEntry } from "@/lib/history";
import { buildComparisonMarkdown } from "@/lib/report";
import {
  sampleBackendJobDescription,
  sampleFrontendJobDescription,
  sampleResumeText,
} from "@/lib/samples";

const MIN_JOB_TEXT_LENGTH = 50;
const MAX_JOB_TEXT_LENGTH = 10_000;
const PREFILL_STORAGE_KEY = "resufit:compare-prefill";

interface JobInput {
  label: string;
  text: string;
}

function getError(payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return "Could not compare these jobs. Please try again.";
}

function getRetrySeconds(payload: unknown): number | null | undefined {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "retryAfterSeconds" in payload
  ) {
    if (payload.retryAfterSeconds === null) return null;
    if (
      typeof payload.retryAfterSeconds === "number" &&
      Number.isFinite(payload.retryAfterSeconds) &&
      payload.retryAfterSeconds >= 0
    ) {
      return payload.retryAfterSeconds;
    }
  }
  return undefined;
}

export default function ComparePage() {
  const router = useRouter();
  const [resume, setResume] = useState<ResumeUploadResult>();
  const [jobs, setJobs] = useState<JobInput[]>([
    { label: "Job 1", text: "" },
    { label: "Job 2", text: "" },
  ]);
  const [result, setResult] = useState<CompareResult>();
  const [isComparing, setIsComparing] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [error, setError] = useState<string>();
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<
    number | null | undefined
  >();
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [uploadKey, setUploadKey] = useState(0);

  const validJobs = useMemo(
    () =>
      jobs.every(
        (job) =>
          job.text.length >= MIN_JOB_TEXT_LENGTH &&
          job.text.length <= MAX_JOB_TEXT_LENGTH,
      ),
    [jobs],
  );
  const canCompare = Boolean(resume?.text.trim()) && validJobs && !isComparing;

  useEffect(() => {
    if (retryCountdown <= 0) return;
    const timer = window.setInterval(
      () => setRetryCountdown((remaining) => Math.max(0, remaining - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [retryCountdown]);

  useEffect(() => {
    if (!isComparing || jobs.length < 2) return;
    const timer = window.setInterval(
      () =>
        setProgressIndex((current) => Math.min(current + 1, jobs.length - 1)),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [isComparing, jobs.length]);

  function updateJob(index: number, update: Partial<JobInput>) {
    setJobs((current) =>
      current.map((job, jobIndex) =>
        jobIndex === index ? { ...job, ...update } : job,
      ),
    );
    setResult(undefined);
    setError(undefined);
  }

  function loadSample() {
    setResume({
      fileName: "sample-resume.txt",
      text: sampleResumeText,
      wordCount: sampleResumeText.trim().split(/\s+/).length,
    });
    setJobs([
      { label: "Job 1", text: sampleFrontendJobDescription },
      { label: "Job 2", text: sampleBackendJobDescription },
    ]);
    setResult(undefined);
    setError(undefined);
    setRetryAfterSeconds(undefined);
    setRetryCountdown(0);
    setUploadKey((current) => current + 1);
  }

  async function compare() {
    if (!canCompare || !resume) return;
    setIsComparing(true);
    setProgressIndex(0);
    setError(undefined);
    setResult(undefined);
    setRetryAfterSeconds(undefined);
    setRetryCountdown(0);

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resume.text,
          jobTexts: jobs.map((job) => job.text),
        }),
      });
      const payload = await readApiResponse(response);
      if (!response.ok) {
        const retrySeconds = getRetrySeconds(payload);
        if (response.status === 429) {
          setRetryAfterSeconds(retrySeconds);
          if (retrySeconds !== null) setRetryCountdown(retrySeconds ?? 60);
        }
        throw new Error(getError(payload));
      }

      const parsed = CompareResultSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("The server returned comparison data in an unexpected format.");
      }
      setResult(parsed.data);
      setJobs((current) =>
        current.map((job, index) => {
          if (job.label !== `Job ${index + 1}`) return job;
          const title = parsed.data.jobs.find((entry) => entry.index === index)
            ?.job?.jobTitle;
          return title ? { ...job, label: title } : job;
        }),
      );
      const ranking = parsed.data.jobs
        .filter((entry) => entry.match)
        .sort((first, second) => second.match!.score - first.match!.score);
      const best = ranking[0];
      const bestMatch = best?.match;
      const savedId = saveHistoryEntry({
        type: "comparison",
        fileName: resume.fileName,
        jobTitle: `Comparison (${ranking.length} jobs)`,
        company: "",
        matchScore: bestMatch?.score ?? 0,
        atsScore: bestMatch?.ats.score ?? 0,
        comparison: parsed.data,
      });
      if (!savedId) {
        setError("Comparison completed, but it could not be saved to browser history.");
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not compare these jobs. Please try again.",
      );
    } finally {
      setIsComparing(false);
    }
  }

  function openFullAnalysis(index: number) {
    if (!resume) return;
    const selectedJob = jobs[index];
    if (!selectedJob) return;
    try {
      sessionStorage.setItem(
        PREFILL_STORAGE_KEY,
        JSON.stringify({
          fileName: resume.fileName,
          resumeText: resume.text,
          jobText: selectedJob.text,
        }),
      );
      router.push("/analyze");
    } catch {
      setError("Could not prepare the full analysis. Please try again.");
    }
  }

  function downloadComparison() {
    if (!result || !resume) return;
    const blob = new Blob(
      [buildComparisonMarkdown(resume.fileName, result)],
      { type: "text/markdown;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resufit-job-comparison.md";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" aria-label="ResuFit" className="mb-2 inline-flex">
              <Logo />
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">
              Compare jobs
            </h1>
            <p className="mt-2 text-stone-700">
              See how one resume aligns with two or three opportunities.
            </p>
          </div>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-2">
            <Link
              href="/analyze"
              className="rounded-md px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
            >
              Analyze
            </Link>
            <Link
              href="/history"
              className="rounded-md px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
            >
              History
            </Link>
          </nav>
        </header>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isComparing}
            onClick={loadSample}
          >
            Try a sample
          </Button>
        </div>

        <UploadBox
          key={uploadKey}
          disabled={isComparing}
          onTextExtracted={(uploaded) => {
            setResume(uploaded);
            setResult(undefined);
            setError(undefined);
          }}
        />
        {resume && (
          <p className="text-sm text-stone-700" role="status">
            Resume ready: {resume.fileName} · {resume.wordCount} words
          </p>
        )}

        <section aria-label="Job descriptions" className="grid min-w-0 gap-4">
          {jobs.map((job, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Job {index + 1}</CardTitle>
                  {jobs.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isComparing}
                      onClick={() => {
                        setJobs((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        );
                        setResult(undefined);
                        setError(undefined);
                      }}
                    >
                      Remove job {index + 1}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="grid gap-1 text-sm font-medium text-stone-800">
                  Optional label for job {index + 1}
                  <input
                    value={job.label}
                    disabled={isComparing}
                    maxLength={100}
                    onChange={(event) =>
                      updateJob(index, { label: event.target.value })
                    }
                    className="h-10 rounded-md border border-stone-300 bg-white px-3"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-stone-800">
                  Job description {index + 1}
                  <Textarea
                    value={job.text}
                    disabled={isComparing}
                    rows={7}
                    maxLength={MAX_JOB_TEXT_LENGTH}
                    onChange={(event) =>
                      updateJob(index, { text: event.target.value })
                    }
                    aria-describedby={`job-count-${index}`}
                  />
                </label>
                <p
                  id={`job-count-${index}`}
                  className="text-sm text-stone-700"
                  aria-live="polite"
                >
                  {job.text.length}/{MAX_JOB_TEXT_LENGTH} characters; at least{" "}
                  {MIN_JOB_TEXT_LENGTH} required
                </p>
              </CardContent>
            </Card>
          ))}
          {jobs.length < 3 && (
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={isComparing}
              onClick={() => {
                setJobs((current) => [
                  ...current,
                  { label: `Job ${current.length + 1}`, text: "" },
                ]);
                setResult(undefined);
                setError(undefined);
              }}
            >
              Add another job
            </Button>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={!canCompare || retryCountdown > 0}
            onClick={() => void compare()}
          >
            {isComparing ? "Comparing…" : "Compare"}
          </Button>
          {result && (
            <Button
              type="button"
              variant="outline"
              disabled={isComparing}
              onClick={downloadComparison}
            >
              Download comparison
            </Button>
          )}
        </div>

        {isComparing && (
          <p className="text-sm font-medium text-indigo-800" role="status">
            Reading job {progressIndex + 1} of {jobs.length}…
          </p>
        )}
        {error && (
          <div className="space-y-2">
            <p className="text-sm text-red-800" role="alert">{error}</p>
            {retryAfterSeconds !== null && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isComparing || retryCountdown > 0}
                  onClick={() => void compare()}
                >
                  Try again
                </Button>
                {retryCountdown > 0 && (
                  <p className="text-sm text-stone-700" role="status">
                    Try again in {retryCountdown} seconds.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {result && (
          <section aria-labelledby="comparison-results-heading" className="grid gap-4">
            <h2
              id="comparison-results-heading"
              tabIndex={-1}
              className="text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
            >
              Comparison results
            </h2>
            <ComparisonResults
              result={result}
              labels={jobs.map((job) => job.label)}
              onOpenFullAnalysis={openFullAnalysis}
            />
          </section>
        )}
      </div>
    </main>
  );
}
