import { NextResponse } from "next/server";
import { getAIError } from "@/lib/ai/routeErrors";
import {
  consumeAIRequest,
  getRequestIp,
  getTextLimitError,
} from "@/lib/ai/limits";
import { suggestResumeImprovements } from "@/lib/ai/suggest";
import { createMatchResult } from "@/lib/matching/result";
import { runAtsChecks } from "@/lib/ats";
import {
  JobRequirementsSchema,
  ResumeSchema,
  type JobRequirements,
  type Resume,
} from "@/lib/schemas";

const RATE_LIMIT_MESSAGE =
  "You've made too many AI requests. Please wait a minute and try again.";

function errorResponse(
  error: string,
  status: number,
  retryAfterSeconds?: number | null,
) {
  return NextResponse.json(
    {
      error,
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
    },
    { status },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (typeof body !== "object" || body === null) {
    return errorResponse("Request body must contain resume, job, and resumeText.", 400);
  }

  const {
    resume: rawResume,
    job: rawJob,
    resumeText,
    jobText,
  } = body as Record<string, unknown>;
  const parsedResume = ResumeSchema.safeParse(rawResume);
  const parsedJob = JobRequirementsSchema.safeParse(rawJob);

  if (
    !parsedResume.success ||
    !parsedJob.success ||
    typeof resumeText !== "string" ||
    typeof jobText !== "string"
  ) {
    return errorResponse("Resume or job requirements have an invalid format.", 400);
  }

  const lengthError = getTextLimitError(resumeText, jobText);
  if (lengthError) {
    return errorResponse(lengthError, 400);
  }

  if (!consumeAIRequest(getRequestIp(request))) {
    return errorResponse(RATE_LIMIT_MESSAGE, 429);
  }

  const resume: Resume = parsedResume.data;
  const job: JobRequirements = parsedJob.data;
  const ats = runAtsChecks({ resumeText, resume, job });
  const baseResult = createMatchResult(resume, job, ats, [], resumeText);

  try {
    const { suggestions } = await suggestResumeImprovements(
      resume,
      job,
      [
        ...baseResult.matchedMustHave,
        ...baseResult.matchedNiceToHave,
      ],
      baseResult.missingMustHave,
      baseResult.missingNiceToHave,
    );
    return NextResponse.json({ ...baseResult, suggestions });
  } catch (error) {
    const aiError = getAIError(error, "suggestions");
    if (aiError?.status === 429) {
      return NextResponse.json({
        ...baseResult,
        suggestions: [],
        suggestionsError: aiError.message.includes("Today's free Gemini limit")
          ? "Suggestions are unavailable right now (daily AI limit). Your score and ATS check are complete."
          : "Suggestions are unavailable right now (AI limit). Your score and ATS check are complete.",
        retryAfterSeconds: aiError.retryAfterSeconds,
      });
    }
    if (aiError) {
      console.error(
        "Resume suggestions failed:",
        error instanceof Error ? error.name : "Unknown error",
      );
    }
    return NextResponse.json({
      ...baseResult,
      suggestions: [],
      suggestionsError:
        aiError?.message ??
        "The AI service could not generate suggestions. Please try again shortly.",
    });
  }
}
