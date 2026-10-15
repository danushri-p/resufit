import { cleanSkillArray, generateStructured } from "@/lib/ai/client";
import { JOB_EXTRACTION_PROMPT } from "@/lib/ai/prompts";
import {
  JobRequirementsSchema,
  type JobRequirements,
} from "@/lib/schemas";

export function extractJD(jobText: string): Promise<JobRequirements> {
  return generateStructured({
    prompt: JOB_EXTRACTION_PROMPT,
    schema: JobRequirementsSchema,
    sourceText: jobText,
  }).then((job) => ({
    ...job,
    mustHaveSkills: cleanSkillArray(job.mustHaveSkills),
    niceToHaveSkills: cleanSkillArray(job.niceToHaveSkills),
  }));
}
