import { NextResponse } from "next/server";
import { z } from "zod";
import { getAIError } from "@/lib/ai/routeErrors";
import {
  consumeAIRequest,
  getRequestIp,
  MAX_RESUME_TEXT_LENGTH,
  MAX_JOB_TEXT_LENGTH,
} from "@/lib/ai/limits";
import { compareResumeToJobs } from "@/lib/compare";
import { CompareResultSchema } from "@/lib/schemas";

const RATE_LIMIT_MESSAGE =
  "You've made too many AI requests. Please wait a minute and try again.";

const compareRequestSchema = z.object({
  resumeText: z.string().min(1).max(MAX_RESUME_TEXT_LENGTH),
  jobTexts: z
    .array(z.string().min(50).max(MAX_JOB_TEXT_LENGTH))
    .min(2)
    .max(3),
});

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

  const parsedRequest = compareRequestSchema.safeParse(body);
  if (!parsedRequest.success || !parsedRequest.data.resumeText.trim() ||
    parsedRequest.data.jobTexts.some((jobText) => !jobText.trim())) {
    return errorResponse(
      "Provide resume text up to 20,000 characters and 2–3 job descriptions of 50–10,000 characters each.",
      400,
    );
  }

  const { resumeText, jobTexts } = parsedRequest.data;
  const requestCost = jobTexts.length + 1;
  if (!consumeAIRequest(getRequestIp(request), Date.now(), requestCost)) {
    return errorResponse(RATE_LIMIT_MESSAGE, 429, 60);
  }

  try {
    const result = await compareResumeToJobs(resumeText, jobTexts);
    const parsedResult = CompareResultSchema.safeParse(result);
    if (!parsedResult.success) {
      throw new Error("Comparison returned an invalid result.");
    }
    return NextResponse.json(parsedResult.data);
  } catch (error) {
    const aiError = getAIError(error, "job comparison");
    if (aiError) {
      return errorResponse(
        aiError.message,
        aiError.status,
        aiError.retryAfterSeconds,
      );
    }
    console.error(
      "Resume comparison failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return errorResponse(
      "The AI service could not compare these jobs. Please try again shortly.",
      502,
    );
  }
}
