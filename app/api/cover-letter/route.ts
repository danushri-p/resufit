import { NextResponse } from "next/server";
import { z } from "zod";
import { getAIError } from "@/lib/ai/routeErrors";
import { generateCoverLetter } from "@/lib/ai/coverLetter";
import { AIRequestError } from "@/lib/ai/errors";
import {
  consumeAIRequest,
  getRequestIp,
  getTextLimitError,
} from "@/lib/ai/limits";
import {
  JobRequirementsSchema,
  MatchResultSchema,
  ResumeSchema,
} from "@/lib/schemas";

const RATE_LIMIT_MESSAGE =
  "You've made too many AI requests. Please wait a minute and try again.";

const coverLetterRequestSchema = z.object({
  resume: ResumeSchema,
  job: JobRequirementsSchema,
  match: MatchResultSchema,
  tone: z.enum(["professional", "friendly"]).optional().default("professional"),
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

function resumeTextFromData(resume: z.infer<typeof ResumeSchema>): string {
  return [
    resume.name,
    resume.email,
    resume.summary,
    ...resume.skills,
    ...resume.certifications,
    ...resume.experience.flatMap((entry) => [
      entry.role,
      entry.company,
      entry.startDate,
      entry.endDate,
      ...entry.bullets,
    ]),
    ...resume.projects.flatMap((project) => [
      project.name,
      project.description,
      ...project.techStack,
      ...project.bullets,
    ]),
    ...resume.education.flatMap((entry) => [
      entry.degree,
      entry.institution,
      entry.year,
    ]),
  ]
    .filter((value): value is string => typeof value === "string")
    .join("\n");
}

function jobTextFromData(job: z.infer<typeof JobRequirementsSchema>): string {
  return [
    job.jobTitle,
    job.company,
    ...job.mustHaveSkills,
    ...job.niceToHaveSkills,
    ...job.responsibilities,
    ...job.keywords,
  ]
    .filter((value): value is string => typeof value === "string")
    .join("\n");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsedRequest = coverLetterRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return errorResponse("Resume, job, match, or tone has an invalid format.", 400);
  }

  const { resume, job, match, tone } = parsedRequest.data;
  const lengthError = getTextLimitError(
    resumeTextFromData(resume),
    jobTextFromData(job),
  );
  if (lengthError) {
    return errorResponse(lengthError, 400);
  }

  if (!consumeAIRequest(getRequestIp(request))) {
    return errorResponse(RATE_LIMIT_MESSAGE, 429);
  }

  try {
    return NextResponse.json(
      await generateCoverLetter(resume, job, match, { tone }),
    );
  } catch (error) {
    if (
      error instanceof AIRequestError &&
      error.status === 422
    ) {
      return errorResponse(error.message, 422);
    }
    const aiError = getAIError(error, "cover letter writing");
    if (aiError) {
      return errorResponse(
        aiError.message,
        aiError.status,
        aiError.retryAfterSeconds,
      );
    }

    console.error(
      "Cover letter generation failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return errorResponse(
      "The AI service could not write a cover letter. Please try again shortly.",
      502,
    );
  }
}
