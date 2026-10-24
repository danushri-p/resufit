"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, MessagesSquare, PenLine } from "lucide-react";
import { UploadBox, type ResumeUploadResult } from "@/components/UploadBox";
import {
  AnalysisCards,
  INTERVIEW_CATEGORIES,
  InterviewWarnings,
  bulletId,
  type BulletChoice,
} from "@/components/results/AnalysisCards";
import { PAGE_CLASS, PageHeader } from "@/components/PageHeader";
import { TrackApplicationButton } from "@/components/TrackApplicationButton";
import { useRouter, useSearchParams } from "next/navigation";
import { startResumeBuilder } from "@/lib/resumeBuilder";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  InterviewPrepResultSchema,
  MatchResultSchema,
  ResumeSchema,
  type InterviewPrepResult,
  type JobRequirements,
  type MatchResult,
  type ProjectBulletRewrites,
  type Resume,
} from "@/lib/schemas";
import { buildInterviewPrepMarkdown, buildMarkdownReport } from "@/lib/report";
import { saveHistoryEntry, updateHistoryEntry } from "@/lib/history";
import { readApiResponse } from "@/lib/apiResponse";
import { sampleJobDescription, sampleResumeText } from "@/lib/samples";

const MIN_JOB_TEXT_LENGTH = 50;
type RateLimitedAction = "analyze" | "rewrite" | "cover-letter" | "interview-prep";
type CoverLetterTone = "professional" | "friendly";

interface ExtractionResult {
  resume: Resume;
  job: JobRequirements;
}

interface MatchAnalysisResponse extends MatchResult {
  suggestionsError?: string;
  retryAfterSeconds?: number | null;
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

function getRetryAfterSeconds(value: unknown): number | null | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "retryAfterSeconds" in value
  ) {
    if (value.retryAfterSeconds === null) return null;
    if (
      typeof value.retryAfterSeconds === "number" &&
      Number.isFinite(value.retryAfterSeconds) &&
      value.retryAfterSeconds >= 0
    ) {
      return value.retryAfterSeconds;
    }
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

function parseMatchAnalysis(value: unknown): MatchAnalysisResponse | undefined {
  const result = MatchResultSchema.safeParse(value);
  if (!result.success) {
    return undefined;
  }

  const suggestionsError =
    typeof value === "object" &&
    value !== null &&
    "suggestionsError" in value &&
    typeof value.suggestionsError === "string"
      ? value.suggestionsError
      : undefined;

  return {
    ...result.data,
    suggestionsError,
    retryAfterSeconds: getRetryAfterSeconds(value),
  };
}

function parseProjectRewrites(value: unknown): ProjectBulletRewrites[] | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("rewrites" in value) ||
    !Array.isArray(value.rewrites)
  ) {
    return undefined;
  }

  const valid = value.rewrites.every(
    (project: unknown) =>
      typeof project === "object" &&
      project !== null &&
      "projectName" in project &&
      typeof project.projectName === "string" &&
      "rewrites" in project &&
      Array.isArray(project.rewrites) &&
      project.rewrites.every(
        (rewrite: unknown) =>
          typeof rewrite === "object" &&
          rewrite !== null &&
          "original" in rewrite &&
          typeof rewrite.original === "string" &&
          "rewritten" in rewrite &&
          typeof rewrite.rewritten === "string" &&
          "reason" in rewrite &&
          typeof rewrite.reason === "string",
      ),
  );

  return valid ? (value.rewrites as ProjectBulletRewrites[]) : undefined;
}

function RetryButton({
  disabled,
  countdown,
  onRetry,
}: {
  disabled: boolean;
  countdown: number;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" disabled={disabled} onClick={onRetry}>
        Try again
      </Button>
      {countdown > 0 && (
        <p className="text-sm text-stone-700" role="status">
          Try again in {countdown} seconds.
        </p>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  const router = useRouter();
  const view = useSearchParams().get("view");
  const [showInputs, setShowInputs] = useState(false);
  const [bulletChoices, setBulletChoices] = useState<Record<string, BulletChoice>>({});
  const [resume, setResume] = useState<ResumeUploadResult>();
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState<ExtractionResult>();
  const [match, setMatch] = useState<MatchAnalysisResponse>();
  const [rewrites, setRewrites] = useState<ProjectBulletRewrites[]>();
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLetterWarnings, setCoverLetterWarnings] = useState<string[]>([]);
  const [coverLetterTone, setCoverLetterTone] =
    useState<CoverLetterTone>("professional");
  const [isWritingCoverLetter, setIsWritingCoverLetter] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState<string>();
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrepResult>();
  const [interviewPrepError, setInterviewPrepError] = useState<string>();
  const [isPreparingInterview, setIsPreparingInterview] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [shownOutlines, setShownOutlines] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSample, setIsSample] = useState(false);
  const [error, setError] = useState<string>();
  const [matchError, setMatchError] = useState<string>();
  const [rewriteError, setRewriteError] = useState<string>();
  const [copiedBullet, setCopiedBullet] = useState<string>();
  const [uploadBoxKey, setUploadBoxKey] = useState(0);
  const [rateLimitedAction, setRateLimitedAction] =
    useState<RateLimitedAction>();
  const [retryCountdown, setRetryCountdown] = useState(0);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const analysisRequestId = useRef(0);
  const rewriteRequestId = useRef(0);
  const coverLetterRequestId = useRef(0);
  const interviewPrepRequestId = useRef(0);
  const historyId = useRef<string | undefined>(undefined);
  const [savedHistoryId, setSavedHistoryId] = useState<string>();
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const isBusy =
    isUploading ||
    isAnalyzing ||
    isMatching ||
    isRewriting ||
    isWritingCoverLetter ||
    isPreparingInterview;
  const isRetryCooldownActive = retryCountdown > 0;

  const canAnalyze =
    Boolean(resume?.text.trim()) &&
    jobText.trim().length >= MIN_JOB_TEXT_LENGTH &&
    retryCountdown === 0 &&
    !isBusy;

  useEffect(() => {
    if (!rateLimitedAction || !isRetryCooldownActive) return;

    const interval = window.setInterval(
      () => setRetryCountdown((remaining) => Math.max(0, remaining - 1)),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [rateLimitedAction, isRetryCooldownActive]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const prefill = window.sessionStorage.getItem("resufit:compare-prefill");
      if (prefill) {
        window.sessionStorage.removeItem("resufit:compare-prefill");
        try {
          const value: unknown = JSON.parse(prefill);
          if (
            typeof value === "object" &&
            value !== null &&
            "fileName" in value &&
            typeof value.fileName === "string" &&
            "resumeText" in value &&
            typeof value.resumeText === "string" &&
            "jobText" in value &&
            typeof value.jobText === "string"
          ) {
            setResume({
              fileName: value.fileName,
              text: value.resumeText,
              wordCount: value.resumeText.trim().split(/\s+/).filter(Boolean).length,
            });
            setJobText(value.jobText);
            return;
          }
          setError("The saved comparison could not prefill the analysis form.");
        } catch {
          setError("The saved comparison could not prefill the analysis form.");
        }
      }

      if (new URLSearchParams(window.location.search).get("sample") === "1") {
        setResume({
          fileName: "sample-resume.txt",
          text: sampleResumeText,
          wordCount: sampleResumeText.trim().split(/\s+/).length,
        });
        setJobText(sampleJobDescription);
        setIsSample(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function setView(next: string) {
    const url = new URL(window.location.href);
    url.searchParams.delete("sample");
    url.searchParams.set("view", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function startRateLimitCooldown(
    action: RateLimitedAction,
    retryAfterSeconds?: number | null,
  ) {
    if (retryAfterSeconds === null) {
      setRateLimitedAction(undefined);
      setRetryCountdown(0);
      return;
    }
    setRateLimitedAction(action);
    setRetryCountdown(retryAfterSeconds ?? 60);
  }

  function clearRateLimitCooldown() {
    setRateLimitedAction(undefined);
    setRetryCountdown(0);
  }

  async function runMatchAnalysis(
    extracted: ExtractionResult,
    uploadedResume: ResumeUploadResult,
    description: string,
    requestId: number,
  ) {
    setIsMatching(true);
    try {
      const matchResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...extracted,
          resumeText: uploadedResume.text,
          jobText: description,
        }),
      });
      const matchPayload = await readApiResponse(matchResponse);
      if (requestId !== analysisRequestId.current) return;

      if (!matchResponse.ok) {
        if (matchResponse.status === 429) {
          startRateLimitCooldown(
            "analyze",
            getRetryAfterSeconds(matchPayload),
          );
        }
        throw new Error(
          getApiError(matchPayload) ?? "Could not analyze the resume match.",
        );
      }

      const parsedMatch = parseMatchAnalysis(matchPayload);
      if (!parsedMatch) {
        throw new Error("The server returned results in an unexpected format.");
      }

      setMatch(parsedMatch);
      setMatchError(undefined);
      setShowInputs(false);
      if (view && view !== "cover-letter" && view !== "interview") setView("overview");
      if (parsedMatch.suggestionsError) {
        startRateLimitCooldown(
          "analyze",
          parsedMatch.retryAfterSeconds,
        );
      }
      const savedHistoryId = saveHistoryEntry({
        fileName: uploadedResume.fileName,
        jobTitle: extracted.job.jobTitle ?? "Untitled job",
        company: extracted.job.company ?? "",
        matchScore: parsedMatch.score,
        atsScore: parsedMatch.ats.score,
        result: {
          ...extracted,
          match: parsedMatch,
          ats: parsedMatch.ats,
          rewrites,
          coverLetter: coverLetter || undefined,
          interviewPrep,
        },
      });
      historyId.current = savedHistoryId;
      setSavedHistoryId(savedHistoryId);
    } catch (matchAnalysisError) {
      if (requestId !== analysisRequestId.current) return;
      setMatchError(
        matchAnalysisError instanceof Error
          ? matchAnalysisError.message
          : "Could not analyze the resume match. Please try again.",
      );
    } finally {
      if (requestId === analysisRequestId.current) {
        setIsMatching(false);
      }
    }
  }

  function retryAction(action: RateLimitedAction) {
    clearRateLimitCooldown();
    if (action === "analyze") {
      if (result) void handleRetrySuggestions();
      else void handleAnalyze();
    } else if (action === "rewrite") {
      void handleRewriteBullets();
    } else if (action === "cover-letter") {
      void handleWriteCoverLetter(true);
    } else {
      void handleInterviewPrep(true);
    }
  }

  function rateLimitRetryButton(action: RateLimitedAction) {
    if (rateLimitedAction !== action) return null;
    return (
      <RetryButton
        disabled={isBusy || retryCountdown > 0}
        countdown={retryCountdown}
        onRetry={() => retryAction(action)}
      />
    );
  }

  function handleResumeExtracted(upload: ResumeUploadResult) {
    analysisRequestId.current += 1;
    rewriteRequestId.current += 1;
    coverLetterRequestId.current += 1;
    interviewPrepRequestId.current += 1;
    setResume(upload);
    setResult(undefined);
    setMatch(undefined);
    setRewrites(undefined);
    setBulletChoices({});
    setCoverLetter("");
    setCoverLetterWarnings([]);
    setCoverLetterError(undefined);
    setInterviewPrep(undefined);
    setInterviewPrepError(undefined);
    setIsPreparingInterview(false);
    setIsPracticeMode(false);
    setShownOutlines(new Set());
    setError(undefined);
    setMatchError(undefined);
    setRewriteError(undefined);
    setCopiedBullet(undefined);
    setIsSample(false);
    setIsAnalyzing(false);
    setIsMatching(false);
    setIsRewriting(false);
    setIsWritingCoverLetter(false);
    historyId.current = undefined;
    setSavedHistoryId(undefined);
  }

  function handleStartOver() {
    analysisRequestId.current += 1;
    rewriteRequestId.current += 1;
    coverLetterRequestId.current += 1;
    interviewPrepRequestId.current += 1;
    setResume(undefined);
    setJobText("");
    setResult(undefined);
    setMatch(undefined);
    setRewrites(undefined);
    setBulletChoices({});
    setCoverLetter("");
    setCoverLetterWarnings([]);
    setCoverLetterError(undefined);
    setInterviewPrep(undefined);
    setInterviewPrepError(undefined);
    setIsPreparingInterview(false);
    setIsPracticeMode(false);
    setShownOutlines(new Set());
    setError(undefined);
    setMatchError(undefined);
    setRewriteError(undefined);
    setIsSample(false);
    clearRateLimitCooldown();
    setIsAnalyzing(false);
    setIsMatching(false);
    setIsRewriting(false);
    setIsWritingCoverLetter(false);
    setCopiedBullet(undefined);
    setUploadBoxKey((key) => key + 1);
    setShowInputs(false);
    historyId.current = undefined;
    setSavedHistoryId(undefined);
  }

  function loadSample() {
    if (isBusy) return;
    handleResumeExtracted({
      fileName: "sample-resume.txt",
      text: sampleResumeText,
      wordCount: sampleResumeText.trim().split(/\s+/).length,
    });
    setJobText(sampleJobDescription);
    setIsSample(true);
  }

  async function handleAnalyze() {
    if (!canAnalyze || !resume) return;

    clearRateLimitCooldown();
    const requestId = ++analysisRequestId.current;
    rewriteRequestId.current += 1;
    coverLetterRequestId.current += 1;
    interviewPrepRequestId.current += 1;
    setIsAnalyzing(true);
    setResult(undefined);
    setMatch(undefined);
    setRewrites(undefined);
    setBulletChoices({});
    setCoverLetter("");
    setCoverLetterWarnings([]);
    setCoverLetterError(undefined);
    setInterviewPrep(undefined);
    setInterviewPrepError(undefined);
    setIsPreparingInterview(false);
    setIsPracticeMode(false);
    setShownOutlines(new Set());
    setError(undefined);
    setMatchError(undefined);
    setRewriteError(undefined);
    setIsRewriting(false);
    setIsWritingCoverLetter(false);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resume.text,
          jobText: jobText.trim(),
        }),
      });
      const payload = await readApiResponse(response);
      if (requestId !== analysisRequestId.current) return;

      if (!response.ok) {
        if (response.status === 429) {
          startRateLimitCooldown("analyze", getRetryAfterSeconds(payload));
        }
        throw new Error(
          getApiError(payload) ?? "Could not analyze the resume and job description.",
        );
      }

      const parsedResult = parseExtractionResult(payload);
      if (!parsedResult) {
        throw new Error("The server returned results in an unexpected format.");
      }

      setResult(parsedResult);
      setIsAnalyzing(false);
      await runMatchAnalysis(
        parsedResult,
        resume,
        jobText.trim(),
        requestId,
      );
    } catch (analyzeError) {
      if (requestId !== analysisRequestId.current) return;
      setError(
        analyzeError instanceof Error
          ? analyzeError.message
          : "Could not analyze the resume and job description. Please try again.",
      );
    } finally {
      if (requestId === analysisRequestId.current) {
        setIsAnalyzing(false);
      }
    }
  }

  async function handleRetrySuggestions() {
    if (!result || !resume || isMatching || retryCountdown > 0) return;

    clearRateLimitCooldown();
    const requestId = ++analysisRequestId.current;
    setMatchError(undefined);
    await runMatchAnalysis(result, resume, jobText.trim(), requestId);
  }

  async function handleRewriteBullets() {
    if (!result || !match || !resume || isRewriting || retryCountdown > 0) return;

    clearRateLimitCooldown();
    const requestId = ++rewriteRequestId.current;
    setIsRewriting(true);
    setRewrites(undefined);
    setBulletChoices({});
    setRewriteError(undefined);

    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: result.resume,
          job: result.job,
          matchedSkills: [
            ...match.matchedMustHave,
            ...match.matchedNiceToHave,
          ],
          missingSkills: [
            ...match.missingMustHave,
            ...match.missingNiceToHave,
          ],
          resumeText: resume.text,
          jobText: jobText.trim(),
        }),
      });
      const payload = await readApiResponse(response);

      if (!response.ok) {
        if (response.status === 429) {
          startRateLimitCooldown("rewrite", getRetryAfterSeconds(payload));
        }
        throw new Error(
          getApiError(payload) ?? "Could not improve the resume bullets.",
        );
      }

      const parsedRewrites = parseProjectRewrites(payload);
      if (!parsedRewrites) {
        throw new Error("The server returned bullet rewrites in an unexpected format.");
      }
      if (requestId !== rewriteRequestId.current) return;
      setRewrites(parsedRewrites);
      setBulletChoices({});
      setView("bullets");
      if (historyId.current) {
        updateHistoryEntry(historyId.current, {
          resume: result.resume,
          job: result.job,
          match,
          ats: match.ats,
          rewrites: parsedRewrites,
          coverLetter: coverLetter || undefined,
          interviewPrep,
        });
      }
    } catch (rewriteFailure) {
      if (requestId !== rewriteRequestId.current) return;
      setRewriteError(
        rewriteFailure instanceof Error
          ? rewriteFailure.message
          : "Could not improve the resume bullets. Please try again.",
      );
    } finally {
      if (requestId === rewriteRequestId.current) {
        setIsRewriting(false);
      }
    }
  }

  async function handleWriteCoverLetter(retrying = false) {
    if (
      !result ||
      !match ||
      !resume ||
      isWritingCoverLetter ||
      (retryCountdown > 0 && !retrying)
    ) {
      return;
    }

    clearRateLimitCooldown();
    const requestId = ++coverLetterRequestId.current;
    setIsWritingCoverLetter(true);
    setCoverLetterError(undefined);

    try {
      const response = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: result.resume,
          job: result.job,
          match,
          tone: coverLetterTone,
        }),
      });
      const payload = await readApiResponse(response);
      if (requestId !== coverLetterRequestId.current) return;

      if (!response.ok) {
        if (response.status === 429) {
          startRateLimitCooldown(
            "cover-letter",
            getRetryAfterSeconds(payload),
          );
        }
        throw new Error(
          getApiError(payload) ?? "Could not write the cover letter.",
        );
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        !("letter" in payload) ||
        typeof payload.letter !== "string" ||
        !("warnings" in payload) ||
        !Array.isArray(payload.warnings) ||
        !payload.warnings.every((warning) => typeof warning === "string")
      ) {
        throw new Error("The server returned a cover letter in an unexpected format.");
      }

      setCoverLetter(payload.letter);
      setCoverLetterWarnings(payload.warnings);
      if (historyId.current) {
        updateHistoryEntry(historyId.current, {
          ...result,
          match,
          ats: match.ats,
          rewrites,
          coverLetter: payload.letter,
          interviewPrep,
        });
      }
    } catch (failure) {
      if (requestId !== coverLetterRequestId.current) return;
      setCoverLetterError(
        failure instanceof Error
          ? failure.message
          : "Could not write the cover letter. Please try again.",
      );
    } finally {
      if (requestId === coverLetterRequestId.current) {
        setIsWritingCoverLetter(false);
      }
    }
  }

  function updateCoverLetter(value: string) {
    setCoverLetter(value);
    if (historyId.current && result && match) {
      updateHistoryEntry(historyId.current, {
        ...result,
        match,
        ats: match.ats,
        rewrites,
        coverLetter: value,
        interviewPrep,
      });
    }
  }

  async function handleInterviewPrep(retrying = false) {
    if (
      !result ||
      !match ||
      isPreparingInterview ||
      (retryCountdown > 0 && !retrying)
    ) {
      return;
    }

    clearRateLimitCooldown();
    const requestId = ++interviewPrepRequestId.current;
    setIsPreparingInterview(true);
    setInterviewPrepError(undefined);

    try {
      const response = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: result.resume,
          job: result.job,
          match,
        }),
      });
      const payload = await readApiResponse(response);
      if (requestId !== interviewPrepRequestId.current) return;

      if (!response.ok) {
        if (response.status === 429) {
          startRateLimitCooldown(
            "interview-prep",
            getRetryAfterSeconds(payload),
          );
        }
        throw new Error(
          getApiError(payload) ?? "Could not prepare interview questions.",
        );
      }

      const parsedPrep = InterviewPrepResultSchema.safeParse(payload);
      if (!parsedPrep.success) {
        throw new Error("The server returned interview prep in an unexpected format.");
      }

      setInterviewPrep(parsedPrep.data);
      setIsPracticeMode(false);
      setShownOutlines(new Set());
      if (historyId.current) {
        updateHistoryEntry(historyId.current, {
          ...result,
          match,
          ats: match.ats,
          rewrites,
          coverLetter: coverLetter || undefined,
          interviewPrep: parsedPrep.data,
        });
      }
    } catch (failure) {
      if (requestId !== interviewPrepRequestId.current) return;
      setInterviewPrepError(
        failure instanceof Error
          ? failure.message
          : "Could not prepare interview questions. Please try again.",
      );
    } finally {
      if (requestId === interviewPrepRequestId.current) {
        setIsPreparingInterview(false);
      }
    }
  }

  function updateShownOutline(id: string) {
    setShownOutlines((current) => {
      const updated = new Set(current);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }

  async function copyInterviewPrep() {
    if (!interviewPrep) return;
    try {
      await navigator.clipboard.writeText(
        `# Interview prep\n\n${buildInterviewPrepMarkdown(interviewPrep)}`,
      );
      setInterviewPrepError(undefined);
    } catch {
      setInterviewPrepError("Could not copy the interview prep to the clipboard.");
    }
  }

  function downloadInterviewPrep() {
    if (!interviewPrep) return;
    const blob = new Blob(
      [`# Interview prep\n\n${buildInterviewPrepMarkdown(interviewPrep)}`],
      { type: "text/markdown;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resufit-interview-prep.md";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyCoverLetter() {
    try {
      await navigator.clipboard.writeText(coverLetter);
      setCoverLetterError(undefined);
    } catch {
      setCoverLetterError("Could not copy the cover letter to the clipboard.");
    }
  }

  function downloadCoverLetter() {
    const blob = new Blob([coverLetter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resufit-cover-letter.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyBullet(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedBullet(id);
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
      copyTimeout.current = setTimeout(() => setCopiedBullet(undefined), 2000);
    } catch {
      setRewriteError("Could not copy the bullet to the clipboard.");
    }
  }

  function openResumeBuilder() {
    if (!result || !match) return;
    const started = startResumeBuilder({
      resume: result.resume,
      rewrites: rewrites ?? [],
      // Rejected rewrites start on the original wording in the builder.
      rejectedBullets: (rewrites ?? []).flatMap((project) =>
        project.rewrites.flatMap((rewrite, index) =>
          bulletChoices[bulletId(project.projectName, index)] === "rejected"
            ? [rewrite.original]
            : [],
        ),
      ),
      matchedSkills: [...match.matchedMustHave, ...match.matchedNiceToHave],
      jobTitle: result.job.jobTitle,
      company: result.job.company,
    });
    if (started) router.push("/resume");
  }

  function downloadReport() {
    if (!result || !match) return;

    const report = buildMarkdownReport({
      fileName: resume?.fileName ?? "resume",
      resume: result.resume,
      job: result.job,
      match,
      rewrites,
      coverLetter: coverLetter || undefined,
      interviewPrep,
    });
    const jobSlug =
      (result.job.jobTitle ?? "job")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "job";
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resufit-report-${jobSlug}.md`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  useEffect(
    () => () => {
      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (match) {
      resultsHeading.current?.focus();
      resultsHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [match]);

  const hasResults = Boolean(result && (match || matchError));
  const showResults = hasResults && !showInputs;
  const viewNeedsAnalysis =
    !hasResults && (view === "cover-letter" || view === "interview");

  const coverLetterPanel = (
    <Card>
      <CardHeader>
        <CardTitle>Cover letter</CardTitle>
        <CardDescription>
          Create a tailored letter grounded in your resume.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="grid max-w-xs gap-2 text-sm font-medium text-stone-800">
          Tone
          <select
            className="h-10 rounded-lg border border-input bg-white px-3"
            value={coverLetterTone}
            disabled={isWritingCoverLetter}
            onChange={(event) =>
              setCoverLetterTone(event.target.value as CoverLetterTone)
            }
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
          </select>
        </label>
        {!coverLetter && (
          <Button
            type="button"
            disabled={isBusy || retryCountdown > 0}
            onClick={() => void handleWriteCoverLetter()}
          >
            <Mail aria-hidden="true" />
            {isWritingCoverLetter
              ? "Writing cover letter…"
              : "Write cover letter"}
          </Button>
        )}
        {isWritingCoverLetter && (
          <p className="text-sm text-indigo-700" role="status">
            Writing a cover letter based on your resume…
          </p>
        )}
        {coverLetterError && (
          <div className="space-y-2">
            <p className="text-sm text-red-700" role="alert">
              {coverLetterError}
            </p>
            {rateLimitRetryButton("cover-letter")}
          </div>
        )}
        {coverLetterWarnings.length > 0 && (
          <div className="rounded-xl bg-stone-100 p-3 text-sm text-stone-700" role="status">
            <p className="font-medium">Accuracy notes</p>
            <ul className="mt-1 list-disc pl-5">
              {coverLetterWarnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        {coverLetter && (
          <>
            <Textarea
              aria-label="Editable cover letter"
              value={coverLetter}
              rows={16}
              disabled={isWritingCoverLetter}
              onChange={(event) => updateCoverLetter(event.target.value)}
            />
            <p className="text-sm text-stone-600" aria-live="polite">
              {coverLetter.trim()
                ? coverLetter.trim().split(/\s+/).length
                : 0}{" "}
              words
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isWritingCoverLetter}
                onClick={() => void copyCoverLetter()}
              >
                Copy
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isWritingCoverLetter}
                onClick={downloadCoverLetter}
              >
                Download .txt
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy || retryCountdown > 0}
                onClick={() => void handleWriteCoverLetter()}
              >
                Regenerate
              </Button>
            </div>
            <p className="text-sm text-stone-600">
              Review and personalise before sending. ResuFit only uses facts from your resume.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );

  const interviewPanel = (
    <Card>
      <CardHeader>
        <CardTitle>Interview prep</CardTitle>
        <CardDescription>
          Practise honest answers for this role using your resume.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!interviewPrep && (
          <Button
            type="button"
            disabled={isBusy || retryCountdown > 0}
            onClick={() => void handleInterviewPrep()}
          >
            <MessagesSquare aria-hidden="true" />
            {isPreparingInterview
              ? "Preparing interview questions…"
              : "Prepare for interview"}
          </Button>
        )}
        {isPreparingInterview && (
          <p className="text-sm text-indigo-700" role="status">
            Preparing interview questions based on your resume…
          </p>
        )}
        {interviewPrepError && (
          <div className="space-y-2">
            <p className="text-sm text-red-700" role="alert">
              {interviewPrepError}
            </p>
            {rateLimitRetryButton("interview-prep")}
          </div>
        )}
        {interviewPrep && (
          <>
            <InterviewWarnings warnings={interviewPrep.warnings} />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                aria-pressed={isPracticeMode}
                onClick={() => {
                  setIsPracticeMode((current) => !current);
                  setShownOutlines(new Set());
                }}
              >
                Practice mode {isPracticeMode ? "on" : "off"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => void copyInterviewPrep()}
              >
                Copy all
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={downloadInterviewPrep}
              >
                Download .md
              </Button>
            </div>
            <div className="space-y-5">
              {INTERVIEW_CATEGORIES.map(([category, title]) => {
                const questions = interviewPrep.questions.filter(
                  (question) => question.category === category,
                );
                if (!questions.length) return null;
                return (
                  <section key={category} className="space-y-3">
                    <h3 className="font-semibold text-stone-900">{title}</h3>
                    <div className="space-y-2">
                      {questions.map((question, index) => {
                        const outlineId = `${category}-${index}`;
                        const showOutline =
                          !isPracticeMode || shownOutlines.has(outlineId);
                        return (
                          <details
                            key={`${outlineId}-${question.question}`}
                            className="rounded-xl border border-stone-200 bg-white p-3"
                          >
                            <summary className="cursor-pointer font-medium text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700">
                              {question.question}
                            </summary>
                            <div className="mt-3 space-y-3 text-sm text-stone-700">
                              <p>
                                <span className="font-medium text-stone-900">
                                  Why they ask:
                                </span>{" "}
                                {question.whyAsked}
                              </p>
                              {question.basedOn && (
                                <p>
                                  <span className="inline-flex rounded-full bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-950">
                                    Based on: {question.basedOn}
                                  </span>
                                </p>
                              )}
                              {showOutline ? (
                                <ul className="list-disc space-y-1 pl-5">
                                  {question.answerOutline.map(
                                    (point, pointIndex) => (
                                      <li key={`${point}-${pointIndex}`}>
                                        {point}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isBusy}
                                  onClick={() =>
                                    updateShownOutline(outlineId)
                                  }
                                >
                                  Show outline
                                </Button>
                              )}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
            <p className="text-sm text-stone-600">
              Outlines use only facts from your resume. Practise saying
              them in your own words.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <main className={PAGE_CLASS}>
      {showResults && result ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1
              ref={resultsHeading}
              tabIndex={-1}
              className="text-2xl font-bold tracking-tight text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 sm:text-3xl"
            >
              Results
            </h1>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setShowInputs(true)}>
                <PenLine aria-hidden="true" />
                Edit inputs
              </Button>
              <Button type="button" variant="outline" onClick={handleStartOver}>
                <ArrowLeft aria-hidden="true" />
                Start over
              </Button>
            </div>
          </div>
          {match ? (
            <AnalysisCards
              resume={result.resume}
              job={result.job}
              match={match}
              rewrites={rewrites}
              subtitle={`${resume?.fileName ?? "Resume"}${isSample ? " · fictional sample" : ""}`}
              tab={view ?? undefined}
              onTabChange={setView}
              isMatching={isUploading || isAnalyzing || isMatching}
              isRewriting={isRewriting}
              retryCountdown={rateLimitedAction === "analyze" ? retryCountdown : 0}
              matchError={matchError}
              suggestionsError={match.suggestionsError}
              rewriteError={rewriteError}
              copiedBullet={copiedBullet}
              bulletChoices={bulletChoices}
              onBulletChoice={(id, choice) =>
                setBulletChoices((current) => {
                  const updated = { ...current };
                  if (choice) updated[id] = choice;
                  else delete updated[id];
                  return updated;
                })
              }
              onRewrite={() => void handleRewriteBullets()}
              onRetrySuggestions={
                match.retryAfterSeconds === null
                  ? undefined
                  : () => void handleRetrySuggestions()
              }
              onRetryMatch={() => void handleRetrySuggestions()}
              onDownload={downloadReport}
              onCopy={(id, content) => void copyBullet(id, content)}
              onBuildResume={openResumeBuilder}
              extraTabs={[
                { id: "cover-letter", label: "Cover letter", content: coverLetterPanel },
                { id: "interview", label: "Interview prep", content: interviewPanel },
              ]}
              extraActions={
                <>
                  {savedHistoryId &&
                    match.missingMustHave.length + match.missingNiceToHave.length > 0 && (
                      <Link
                        href={`/learn?from=${encodeURIComponent(savedHistoryId)}`}
                        className={cn(buttonVariants({ variant: "outline" }))}
                      >
                        Make a learning plan
                      </Link>
                    )}
                  <TrackApplicationButton
                    role={result.job.jobTitle}
                    company={result.job.company}
                    matchScore={match.score}
                    historyId={savedHistoryId ?? null}
                  />
                </>
              }
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Match analysis</CardTitle>
                <CardDescription>
                  Your resume and the job were read, but the match could not be calculated.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {isMatching && (
                  <p className="text-sm text-indigo-700" role="status">
                    Calculating your match and generating suggestions…
                  </p>
                )}
                <p className="text-sm text-red-700" role="alert">
                  {matchError}
                </p>
                {rateLimitedAction === "analyze" ? (
                  rateLimitRetryButton("analyze")
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => void handleRetrySuggestions()}
                  >
                    Try again
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          <PageHeader
            title="Analyze your resume"
            description="Upload your resume and add the job description you have in mind."
            actions={
              hasResults && (
                <Button type="button" variant="outline" onClick={() => setShowInputs(false)}>
                  View results
                  <ArrowRight aria-hidden="true" />
                </Button>
              )
            }
          />

          {viewNeedsAnalysis && (
            <p
              className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950"
              role="status"
            >
              Analyze a resume first, then you can{" "}
              {view === "cover-letter" ? "write a cover letter" : "prepare for interviews"}{" "}
              for that job here.
            </p>
          )}

          <nav aria-label="Analysis steps" className="flex flex-wrap items-center gap-2 text-sm">
            {["Upload", "Job description", "Results"].map((step, index) => {
              const activeStep =
                match || isAnalyzing || isMatching ? 2 : resume ? 1 : 0;
              return <span key={step} className={`rounded-full px-3 py-1 ${index === activeStep ? "bg-indigo-100 font-medium text-indigo-900" : "text-stone-500"}`}>{index + 1}. {step}{index < 2 ? " →" : ""}</span>;
            })}
          </nav>

          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
            <div className="grid min-w-0 gap-4">
              <UploadBox
                key={uploadBoxKey}
                onTextExtracted={handleResumeExtracted}
                onUploadingChange={setIsUploading}
              />
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-stone-600">No resume handy?</span>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={isBusy}
                  onClick={loadSample}
                >
                  Try a sample
                </Button>
              </div>
              {isSample && (
                <p className="text-sm font-medium text-indigo-900" role="status">
                  Sample data: fictional resume and job description.
                </p>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Extracted resume text</CardTitle>
                  <CardDescription>
                    {resume
                      ? `${resume.fileName} · ${resume.wordCount} words${isSample ? " · fictional sample" : ""}`
                      : "Your resume text will appear here after upload."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre
                    tabIndex={0}
                    aria-live="polite"
                    className="max-h-64 min-h-32 overflow-y-auto break-words whitespace-pre-wrap rounded-xl bg-stone-100 p-4 font-sans text-sm leading-6 text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    {resume?.text ?? "No resume text to preview yet."}
                  </pre>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Paste job description</CardTitle>
                <CardDescription>
                  Paste at least {MIN_JOB_TEXT_LENGTH} characters to enable analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={jobText}
                  onChange={(event) => {
                    analysisRequestId.current += 1;
                    rewriteRequestId.current += 1;
                    coverLetterRequestId.current += 1;
                    interviewPrepRequestId.current += 1;
                    setJobText(event.target.value);
                    setResult(undefined);
                    setMatch(undefined);
                    setRewrites(undefined);
                    setBulletChoices({});
                    setCoverLetter("");
                    setCoverLetterWarnings([]);
                    setCoverLetterError(undefined);
                    setInterviewPrep(undefined);
                    setInterviewPrepError(undefined);
                    setIsPreparingInterview(false);
                    setIsPracticeMode(false);
                    setShownOutlines(new Set());
                    setIsAnalyzing(false);
                    setIsMatching(false);
                    setIsRewriting(false);
                    setIsWritingCoverLetter(false);
                    setError(undefined);
                    setMatchError(undefined);
                    setRewriteError(undefined);
                    historyId.current = undefined;
                    setSavedHistoryId(undefined);
                  }}
                  placeholder="Paste the job description here..."
                  rows={14}
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
                  size="lg"
                  className="w-full"
                  disabled={!canAnalyze}
                  onClick={() => void handleAnalyze()}
                >
                  {isAnalyzing || isMatching ? "Analyzing…" : "Analyze"}
                </Button>
                {isAnalyzing && !isMatching && (
                  <p className="text-sm text-indigo-700" role="status">
                    Extracting structured details from both documents…
                  </p>
                )}
                {isMatching && (
                  <p className="text-sm text-indigo-700" role="status">
                    Calculating your match and generating suggestions…
                  </p>
                )}
                {error && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-700" role="alert">
                      {error}
                    </p>
                    {rateLimitRetryButton("analyze")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {!hasResults && (
            <section aria-labelledby="analyze-how" className="rounded-2xl bg-white p-6 ring-1 ring-stone-200">
              <h2 id="analyze-how" className="font-semibold text-stone-900">How it works</h2>
              <ol className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Upload resume", "PDF or DOCX"],
                  ["Add job description", "Paste the full posting"],
                  ["Get match score", "Skills, keywords and ATS check"],
                  ["Improve and download", "Rewrites, cover letter, tailored resume"],
                ].map(([title, detail], index) => (
                  <li key={title} className="flex items-center gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-semibold text-indigo-800">
                      {index + 1}
                    </span>
                    <span>
                      <span className="block font-medium text-stone-900">{title}</span>
                      <span className="text-stone-600">{detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </main>
  );
}
