import type { JobRequirements, MatchResult, Resume } from "@/lib/schemas";
import { matchSkills } from "@/lib/matching/skills";
import { computeMatchScore, getMatchLabel } from "@/lib/matching/score";

export function createMatchResult(
  resume: Resume,
  job: JobRequirements,
  suggestions: MatchResult["suggestions"] = [],
): MatchResult {
  const resumeSkills = [
    ...resume.skills,
    ...resume.projects.flatMap((project) => project.techStack),
  ];
  const mustHave = matchSkills(resumeSkills, job.mustHaveSkills);
  const niceToHave = matchSkills(resumeSkills, job.niceToHaveSkills);
  const score = computeMatchScore(resume, job, mustHave, niceToHave);

  return {
    score,
    label: getMatchLabel(score),
    matchedMustHave: mustHave.matched,
    missingMustHave: mustHave.missing,
    matchedNiceToHave: niceToHave.matched,
    missingNiceToHave: niceToHave.missing,
    suggestions,
  };
}
