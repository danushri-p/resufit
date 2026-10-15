import { NextResponse } from "next/server";
import { z } from "zod";
import {
  JobRequirementsSchema,
  ResumeSchema,
} from "@/lib/schemas";
import {
  InvalidAIOutputError,
  OllamaRequestError,
  OllamaTimeoutError,
  OllamaUnavailableError,
  getOllamaModel,
} from "@/lib/ai/client";
import { rewriteBullets } from "@/lib/ai/rewrite";

const rewriteRequestSchema = z.object({
  resume: ResumeSchema,
  job: JobRequirementsSchema,
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
});

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function ollamaErrorResponse(error: unknown) {
  if (error instanceof InvalidAIOutputError) {
    return errorResponse(
      "The AI returned bullet rewrites in an unexpected format. Please try again.",
      502,
    );
  }

  if (error instanceof OllamaUnavailableError) {
    return errorResponse(
      `Ollama is not running. Start Ollama and make sure the ${getOllamaModel()} model is installed.`,
      503,
    );
  }

  if (error instanceof OllamaTimeoutError) {
    return errorResponse(
      "Ollama took too long to respond. Try again, or use a shorter resume or job description.",
      504,
    );
  }

  if (error instanceof OllamaRequestError) {
    console.error("Ollama bullet rewrite request failed:", {
      status: error.status,
    });
    if (error.status === 404) {
      return errorResponse(
        `The ${getOllamaModel()} model is not installed. Run \`ollama pull ${getOllamaModel()}\`, then try again.`,
        503,
      );
    }
    return errorResponse(
      "Ollama could not complete the rewrite request. Check that the local Ollama service is running and try again.",
      502,
    );
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

  const { resume, job, matchedSkills, missingSkills } = parsedRequest.data;
  try {
    const rewrites = await rewriteBullets(
      resume,
      job,
      matchedSkills,
      missingSkills,
    );
    return NextResponse.json({ rewrites });
  } catch (error) {
    return ollamaErrorResponse(error);
  }
}
