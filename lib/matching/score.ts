import type { JobRequirements, MatchResult, Resume } from "@/lib/schemas";
import type { SkillMatch } from "@/lib/matching/skills";

const MUST_HAVE_WEIGHT = 0.7;
const NICE_TO_HAVE_WEIGHT = 0.2;
const EXPERIENCE_WEIGHT = 0.1;

function coverage(matched: string[], required: string[]): number {
  return required.length === 0 ? 1 : matched.length / required.length;
}

export function getMatchLabel(score: number): MatchResult["label"] {
  if (score >= 80) return "Strong match";
  if (score >= 60) return "Good match";
  if (score >= 40) return "Partial match";
  return "Weak match";
}

export function computeMatchScore(
  resume: Resume,
  job: JobRequirements,
  mustHave: SkillMatch,
  niceToHave: SkillMatch,
): number {
  const requiredYears = job.yearsOfExperience;

  // Count each listed experience entry as one year; projects contribute no years.
  const experienceCoverage =
    requiredYears === null
      ? 1
      : requiredYears <= 0
        ? 1
        : Math.min(resume.experience.length / requiredYears, 1);

  const score =
    MUST_HAVE_WEIGHT * coverage(mustHave.matched, job.mustHaveSkills) +
    NICE_TO_HAVE_WEIGHT * coverage(niceToHave.matched, job.niceToHaveSkills) +
    EXPERIENCE_WEIGHT * experienceCoverage;

  return Math.round(score * 100);
}
