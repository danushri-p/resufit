import { NextResponse } from "next/server";
import {
  InvalidAIOutputError,
  OllamaRequestError,
  OllamaTimeoutError,
  OllamaUnavailableError,
  getOllamaModel,
} from "@/lib/ai/client";
import { suggestResumeImprovements } from "@/lib/ai/suggest";
import { createMatchResult } from "@/lib/matching/result";
import { runAtsChecks } from "@/lib/ats";
import {
  JobRequirementsSchema,
  ResumeSchema,
  type JobRequirements,
  type Resume,
} from "@/lib/schemas";

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function suggestionsErrorMessage(error: unknown): string {
  if (error instanceof InvalidAIOutputError) {
    return "The AI returned suggestions in an unexpected format.";
  }

  if (error instanceof OllamaUnavailableError) {
    return `Ollama is not running. Start Ollama and make sure the ${getOllamaModel()} model is installed.`;
  }

  if (error instanceof OllamaTimeoutError) {
    return "Ollama took too long to respond while generating suggestions.";
  }

  if (error instanceof OllamaRequestError) {
    console.error("Ollama suggestions request failed:", {
      status: error.status,
    });
    if (error.status === 404) {
      return `The ${getOllamaModel()} model is not installed. Run \`ollama pull ${getOllamaModel()}\`, then try again.`;
    }
    return "Ollama could not complete the suggestions request. Check that the local Ollama service is running and try again.";
  }

  console.error(
    "Resume suggestions failed:",
    error instanceof Error ? error.name : "Unknown error",
  );
  return "The AI service could not generate suggestions. Please try again shortly.";
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

  const { resume: rawResume, job: rawJob, resumeText } = body as Record<string, unknown>;
  const parsedResume = ResumeSchema.safeParse(rawResume);
  const parsedJob = JobRequirementsSchema.safeParse(rawJob);

  if (
    !parsedResume.success ||
    !parsedJob.success ||
    typeof resumeText !== "string"
  ) {
    return errorResponse("Resume or job requirements have an invalid format.", 400);
  }

  const resume: Resume = parsedResume.data;
  const job: JobRequirements = parsedJob.data;
  const ats = runAtsChecks({ resumeText, resume, job });
  const baseResult = createMatchResult(resume, job, ats);

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
    return NextResponse.json({
      ...baseResult,
      suggestions: [],
      suggestionsError: suggestionsErrorMessage(error),
    });
  }
}
