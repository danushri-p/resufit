import { runAtsChecks, getAtsKeywordCoverage } from "@/lib/ats";
import { extractJD } from "@/lib/ai/extractJD";
import { extractResume } from "@/lib/ai/extractResume";
import { getAIError } from "@/lib/ai/routeErrors";
import { createMatchResult } from "@/lib/matching/result";
import { normalizeSkill } from "@/lib/matching/skills";
import type { CompareResult, JobComparison, SkillGap } from "@/lib/schemas";

export async function compareResumeToJobs(
  resumeText: string,
  jobTexts: string[],
): Promise<CompareResult> {
  const resume = await extractResume(resumeText);
  const jobs: JobComparison[] = [];
  const causes: unknown[] = [];

  const extractOne = async (text: string, index: number) => {
    try {
      const job = await extractJD(text);
      const ats = runAtsChecks({ resumeText, resume, job });
      return {
        index,
        job,
        match: createMatchResult(resume, job, ats, [], resumeText),
        atsKeywordCoverage: getAtsKeywordCoverage(resumeText, job),
      } satisfies JobComparison;
    } catch (error) {
      causes[index] = error;
      return {
        index,
        error:
          getAIError(error, "job extraction")?.message ??
          "The job description could not be analyzed. Please try again.",
      } satisfies JobComparison;
    }
  };

  if (process.env.AI_PROVIDER === "gemini") {
    for (const [index, text] of jobTexts.entries()) {
      jobs.push(await extractOne(text, index));
    }
  } else {
    jobs.push(
      ...(await Promise.all(
        jobTexts.map((text, index) => extractOne(text, index)),
      )),
    );
  }

  const failures = jobs.filter((entry) => Boolean(entry.error));
  const successfulJobs = jobs.filter(
    (entry): entry is JobComparison & { job: NonNullable<JobComparison["job"]>; match: NonNullable<JobComparison["match"]>; atsKeywordCoverage: number } =>
      Boolean(entry.job && entry.match && entry.atsKeywordCoverage !== undefined),
  );

  if (successfulJobs.length === 0 && failures.length) {
    throw causes[failures[0].index];
  }

  const gaps = new Map<string, { skill: string; jobTitles: string[] }>();
  for (const entry of successfulJobs) {
    const title = entry.job.jobTitle?.trim() || `Job ${entry.index + 1}`;
    const seenForJob = new Set<string>();
    for (const skill of entry.match.missingMustHave) {
      const key = normalizeSkill(skill);
      if (!key || seenForJob.has(key)) continue;
      seenForJob.add(key);
      const gap = gaps.get(key) ?? { skill, jobTitles: [] };
      gap.jobTitles.push(title);
      gaps.set(key, gap);
    }
  }

  const skillGaps: SkillGap[] = [...gaps.values()]
    .map(({ skill, jobTitles }) => ({
      skill,
      missingIn: jobTitles.length,
      jobTitles,
    }))
    .sort(
      (first, second) =>
        second.missingIn - first.missingIn ||
        first.skill.localeCompare(second.skill),
    );

  const rankedJobs = [...jobs].sort((first, second) => {
    if (first.match && second.match) return second.match.score - first.match.score;
    if (first.match) return -1;
    if (second.match) return 1;
    return first.index - second.index;
  });

  return { resume, jobs: rankedJobs, skillGaps };
}
