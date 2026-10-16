import { cleanSkillArray, generateStructured } from "@/lib/ai/client";
import { cacheAIResult } from "@/lib/ai/cache";
import { JOB_EXTRACTION_PROMPT } from "@/lib/ai/prompts";
import {
  JobRequirementsSchema,
  type JobRequirements,
} from "@/lib/schemas";

export function extractJD(jobText: string): Promise<JobRequirements> {
  return cacheAIResult("job-extraction-v1", jobText, async () => {
    const job = await generateStructured({
      prompt: JOB_EXTRACTION_PROMPT,
      schema: JobRequirementsSchema,
      sourceText: jobText,
    });
    return postProcessJob(job);
  });
}

export function postProcessJob(job: JobRequirements): JobRequirements {
  return {
    ...job,
    mustHaveSkills: cleanSkillArray(job.mustHaveSkills),
    niceToHaveSkills: cleanSkillArray(job.niceToHaveSkills),
  };
}
