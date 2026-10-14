import { extractWithOllama } from "@/lib/ai/client";
import { JOB_EXTRACTION_PROMPT } from "@/lib/ai/prompts";
import {
  JobRequirementsSchema,
  type JobRequirements,
} from "@/lib/schemas";

export function extractJD(jobText: string): Promise<JobRequirements> {
  return extractWithOllama({
    prompt: JOB_EXTRACTION_PROMPT,
    schema: JobRequirementsSchema,
    sourceText: jobText,
  });
}
