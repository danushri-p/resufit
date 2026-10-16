import { NextResponse } from "next/server";
import { z } from "zod";
import { AIRequestError } from "@/lib/ai/errors";
import { generateInterviewPrep } from "@/lib/ai/interviewPrep";
import { getAIError } from "@/lib/ai/routeErrors";
import {
  consumeAIRequest,
  getRequestIp,
  getTextLimitError,
} from "@/lib/ai/limits";
import {
  InterviewPrepResultSchema,
  JobRequirementsSchema,
  MatchResultSchema,
  ResumeSchema,
} from "@/lib/schemas";

const RATE_LIMIT_MESSAGE =
  "You've made too many AI requests. Please wait a minute and try again.";

const interviewPrepRequestSchema = z.object({
  resume: ResumeSchema,
  job: JobRequirementsSchema,
  match: MatchResultSchema,
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

function resumeText(resume: z.infer<typeof ResumeSchema>): string {
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

function jobText(job: z.infer<typeof JobRequirementsSchema>): string {
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

  const parsedRequest = interviewPrepRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return errorResponse("Resume, job, or match data has an invalid format.", 400);
  }

  const { resume, job, match } = parsedRequest.data;
  const lengthError = getTextLimitError(resumeText(resume), jobText(job));
  if (lengthError) {
    return errorResponse(lengthError, 400);
  }

  if (!consumeAIRequest(getRequestIp(request))) {
    return errorResponse(RATE_LIMIT_MESSAGE, 429);
  }

  try {
    const result = await generateInterviewPrep(resume, job, match);
    const parsedResult = InterviewPrepResultSchema.safeParse(result);
    if (!parsedResult.success) {
      throw new Error("Interview preparation returned an invalid result.");
    }
    return NextResponse.json(parsedResult.data);
  } catch (error) {
    if (error instanceof AIRequestError && error.status === 422) {
      return errorResponse(error.message, 422);
    }
    const aiError = getAIError(error, "interview preparation");
    if (aiError) {
      return errorResponse(
        aiError.message,
        aiError.status,
        aiError.retryAfterSeconds,
      );
    }

    console.error(
      "Interview preparation failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return errorResponse(
      "The AI service could not prepare interview questions. Please try again shortly.",
      502,
    );
  }
}
