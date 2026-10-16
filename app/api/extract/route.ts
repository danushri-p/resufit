import { NextResponse } from "next/server";
import { getAIError } from "@/lib/ai/routeErrors";
import { extractJD } from "@/lib/ai/extractJD";
import { extractResume } from "@/lib/ai/extractResume";
import {
  consumeAIRequest,
  getRequestIp,
  getTextLimitError,
} from "@/lib/ai/limits";

const MIN_JOB_TEXT_LENGTH = 50;
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
    return errorResponse("Request body must contain resumeText and jobText.", 400);
  }

  const { resumeText, jobText } = body as Record<string, unknown>;

  if (typeof resumeText !== "string" || !resumeText.trim()) {
    return errorResponse("Please upload a resume with extractable text.", 400);
  }

  if (typeof jobText !== "string" || !jobText.trim()) {
    return errorResponse("Please enter a job description.", 400);
  }

  if (jobText.trim().length < MIN_JOB_TEXT_LENGTH) {
    return errorResponse(
      `The job description must be at least ${MIN_JOB_TEXT_LENGTH} characters.`,
      400,
    );
  }

  const lengthError = getTextLimitError(resumeText, jobText);
  if (lengthError) {
    return errorResponse(lengthError, 400);
  }

  if (!consumeAIRequest(getRequestIp(request))) {
    return errorResponse(RATE_LIMIT_MESSAGE, 429);
  }

  try {
    let resume: Awaited<ReturnType<typeof extractResume>>;
    let job: Awaited<ReturnType<typeof extractJD>>;
    if (process.env.AI_PROVIDER === "gemini") {
      resume = await extractResume(resumeText);
      job = await extractJD(jobText);
    } else {
      [resume, job] = await Promise.all([
        extractResume(resumeText),
        extractJD(jobText),
      ]);
    }

    return NextResponse.json({ resume, job });
  } catch (error) {
    const aiError = getAIError(error, "extraction");
    if (aiError) {
      return errorResponse(
        aiError.message,
        aiError.status,
        aiError.retryAfterSeconds,
      );
    }

    console.error(
      "Resume and job extraction failed:",
      error instanceof Error ? error.name : "Unknown error",
    );

    return errorResponse(
      "The AI service could not extract the information. Please try again shortly.",
      502,
    );
  }
}
