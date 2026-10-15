import { NextResponse } from "next/server";
import { z } from "zod";
import {
  JobRequirementsSchema,
  ResumeSchema,
} from "@/lib/schemas";
import { getAIError } from "@/lib/ai/routeErrors";
import {
  consumeAIRequest,
  getRequestIp,
  getTextLimitError,
} from "@/lib/ai/limits";
import { rewriteBullets } from "@/lib/ai/rewrite";

const RATE_LIMIT_MESSAGE =
  "You've made too many AI requests. Please wait a minute and try again.";

const rewriteRequestSchema = z.object({
  resume: ResumeSchema,
  job: JobRequirementsSchema,
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  resumeText: z.string(),
  jobText: z.string(),
});

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsedRequest = rewriteRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return errorResponse("Resume, job, or skill data has an invalid format.", 400);
  }

  const {
    resume,
    job,
    matchedSkills,
    missingSkills,
    resumeText,
    jobText,
  } = parsedRequest.data;
  const lengthError = getTextLimitError(resumeText, jobText);
  if (lengthError) {
    return errorResponse(lengthError, 400);
  }

  if (!consumeAIRequest(getRequestIp(request))) {
    return errorResponse(RATE_LIMIT_MESSAGE, 429);
  }

  try {
    const rewrites = await rewriteBullets(
      resume,
      job,
      matchedSkills,
      missingSkills,
    );
    return NextResponse.json({ rewrites });
  } catch (error) {
    const aiError = getAIError(error, "bullet rewriting");
    if (aiError) {
      return errorResponse(aiError.message, aiError.status);
    }
    console.error(
      "Bullet rewrite failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return errorResponse(
      "The AI service could not rewrite the bullets. Please try again shortly.",
      502,
    );
  }
}
