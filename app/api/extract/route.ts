import { NextResponse } from "next/server";
import {
  InvalidAIOutputError,
  OllamaRequestError,
  OllamaTimeoutError,
  OllamaUnavailableError,
  getOllamaModel,
} from "@/lib/ai/client";
import { extractJD } from "@/lib/ai/extractJD";
import { extractResume } from "@/lib/ai/extractResume";

const MIN_JOB_TEXT_LENGTH = 50;

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

  try {
    const [resume, job] = await Promise.all([
      extractResume(resumeText),
      extractJD(jobText),
    ]);

    return NextResponse.json({ resume, job });
  } catch (error) {
    if (error instanceof InvalidAIOutputError) {
      return errorResponse(
        "The AI returned data in an unexpected format. Please try again.",
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
      console.error("Ollama extraction request failed:", {
        status: error.status,
      });
      if (error.status === 404) {
        return errorResponse(
          `The ${getOllamaModel()} model is not installed. Run \`ollama pull ${getOllamaModel()}\`, then try again.`,
          503,
        );
      }
      return errorResponse(
        "Ollama could not complete the extraction request. Check that the local Ollama service is running and try again.",
        502,
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
