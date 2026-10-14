import { extractWithOllama } from "@/lib/ai/client";
import { RESUME_EXTRACTION_PROMPT } from "@/lib/ai/prompts";
import { ResumeSchema, type Resume } from "@/lib/schemas";

export function extractResume(resumeText: string): Promise<Resume> {
  return extractWithOllama({
    prompt: RESUME_EXTRACTION_PROMPT,
    schema: ResumeSchema,
    sourceText: resumeText,
  });
}
