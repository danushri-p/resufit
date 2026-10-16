import { normalizeSkill } from "@/lib/matching/skills";
import type { JobRequirements, Resume } from "@/lib/schemas";

export interface AtsCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

const ACTION_VERBS = [
  "Built",
  "Developed",
  "Designed",
  "Implemented",
  "Led",
  "Created",
  "Improved",
  "Integrated",
  "Optimized",
  "Automated",
  "Reduced",
  "Increased",
  "Launched",
  "Deployed",
];

function statusForShare(share: number): AtsCheck["status"] {
  if (share >= 0.7) return "pass";
  if (share >= 0.4) return "warn";
  return "fail";
}

function resumeContainsKeyword(resumeText: string, keyword: string): boolean {
  const target = normalizeSkill(keyword);
  if (!target) return false;

  const words = resumeText.match(/[\p{L}\p{N}+#]+(?:\.[\p{L}\p{N}+#]+)*/gu) ?? [];
  for (let start = 0; start < words.length; start += 1) {
    for (let end = start + 1; end <= Math.min(start + 5, words.length); end += 1) {
      if (normalizeSkill(words.slice(start, end).join(" ")) === target) {
        return true;
      }
    }
  }
  return false;
}

function getKeywordAssessment(
  resumeText: string,
  job: JobRequirements,
): { coverage: number; missingKeywords: string[] } {
  const jobTitle = job.jobTitle ? normalizeSkill(job.jobTitle) : "";
  const seenKeywords = new Set<string>();
  const keywords = [...job.mustHaveSkills, ...job.niceToHaveSkills].filter(
    (keyword) => {
      const normalized = normalizeSkill(keyword);
      if (!normalized || normalized === jobTitle || seenKeywords.has(normalized)) {
        return false;
      }
      seenKeywords.add(normalized);
      return true;
    },
  );
  const missingKeywords = keywords.filter(
    (keyword) => !resumeContainsKeyword(resumeText, keyword),
  );
  return {
    coverage:
      keywords.length === 0
        ? 1
        : (keywords.length - missingKeywords.length) / keywords.length,
    missingKeywords,
  };
}

export function getAtsKeywordCoverage(
  resumeText: string,
  job: JobRequirements,
): number {
  return Math.round(getKeywordAssessment(resumeText, job).coverage * 100);
}

function checkDetails(status: AtsCheck["status"], pass: string, warn: string, fail: string) {
  if (status === "pass") return pass;
  if (status === "warn") return warn;
  return fail;
}

function hasPhoneNumber(resumeText: string): boolean {
  const candidates = resumeText.match(/\+?\d[\d\s().-]*\d/g) ?? [];

  return candidates.some((candidate) => {
    const digits = candidate.replace(/\D/g, "");
    const isYearRange = /^\d{4}\s*-\s*\d{4}$/.test(candidate.trim());
    return digits.length >= 10 && digits.length <= 15 && !isYearRange;
  });
}

export function runAtsChecks({
  resumeText,
  resume,
  job,
}: {
  resumeText: string;
  resume: Resume;
  job: JobRequirements;
}): { score: number; checks: AtsCheck[] } {
  const emailFound = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(resumeText);
  const phoneFound = hasPhoneNumber(resumeText);
  const contactStatus: AtsCheck["status"] =
    emailFound && phoneFound ? "pass" : emailFound || phoneFound ? "warn" : "fail";

  const headings = [
    /^\s*(?:skills|technical skills|skills\s*&\s*tools|core skills|key skills)\s*:?\s*$/im.test(resumeText),
    /^\s*(?:education|academic background|education\s*&\s*certifications)\s*:?\s*$/im.test(resumeText),
    /^\s*(?:experience|work experience|professional experience|internships|projects|academic projects|personal projects)\s*:?\s*$/im.test(resumeText),
  ];
  const missingHeadings = headings.filter((found) => !found).length;
  const sectionStatus: AtsCheck["status"] =
    missingHeadings === 0 ? "pass" : missingHeadings === 1 ? "warn" : "fail";

  const wordCount = resumeText.trim().split(/\s+/).filter(Boolean).length;
  const lengthStatus: AtsCheck["status"] =
    wordCount >= 300 && wordCount <= 900
      ? "pass"
      : (wordCount >= 200 && wordCount < 300) ||
          (wordCount > 900 && wordCount <= 1200)
        ? "warn"
        : "fail";

  const { coverage: keywordShare, missingKeywords } = getKeywordAssessment(
    resumeText,
    job,
  );
  const keywordStatus = statusForShare(keywordShare);

  const bullets = [
    ...resume.projects.flatMap((project) => project.bullets),
    ...resume.experience.flatMap((entry) => entry.bullets),
  ];
  const strongVerbPattern = new RegExp(`^(?:${ACTION_VERBS.join("|")})\\b`, "i");
  const actionVerbCount = bullets.filter((bullet) =>
    strongVerbPattern.test(bullet.trim()),
  ).length;
  const actionVerbShare =
    bullets.length === 0 ? 0 : actionVerbCount / bullets.length;
  const actionVerbStatus = statusForShare(actionVerbShare);

  const hasMetrics = bullets.some((bullet) => /\d/.test(bullet));
  const checks: AtsCheck[] = [
    {
      id: "contact",
      label: "Contact information",
      status: contactStatus,
      detail: checkDetails(
        contactStatus,
        "Your resume includes an email address and phone number.",
        `Your resume includes ${emailFound ? "an email address" : "a phone number"} but is missing ${emailFound ? "a phone number" : "an email address"}.`,
        "Your resume is missing an email address and phone number.",
      ),
    },
    {
      id: "sections",
      label: "Resume sections",
      status: sectionStatus,
      detail: checkDetails(
        sectionStatus,
        "Your resume has Skills, Education, and Experience or Projects headings.",
        "Your resume is missing one recommended section heading.",
        "Your resume is missing multiple recommended section headings.",
      ),
    },
    {
      id: "length",
      label: "Resume length",
      status: lengthStatus,
      detail: checkDetails(
        lengthStatus,
        `Your resume has ${wordCount} words, within the recommended range.`,
        `Your resume has ${wordCount} words; consider adjusting it toward 300–900 words.`,
        `Your resume has ${wordCount} words, outside the recommended 200–1,200 word range.`,
      ),
    },
    {
      id: "keywords",
      label: "Job keywords",
      status: keywordStatus,
      detail: missingKeywords.length > 0
        ? `Your resume is missing ${missingKeywords.slice(0, 5).join(", ")}${missingKeywords.length > 5 ? ", and other" : ""} job keywords.`
        : "Your resume includes all listed job keywords.",
    },
    {
      id: "actionVerbs",
      label: "Action verbs",
      status: actionVerbStatus,
      detail: checkDetails(
        actionVerbStatus,
        "Most of your bullets start with a strong action verb.",
        "Some of your bullets could start with a stronger action verb.",
        "Few of your bullets start with a strong action verb.",
      ),
    },
    {
      id: "metrics",
      label: "Measurable results",
      status: hasMetrics ? "pass" : "warn",
      detail: hasMetrics
        ? "Your resume includes a measurable number in a bullet."
        : "Add real numbers where you can (users, APIs, % improvement).",
    },
  ];
  const score = Math.round(
    checks.reduce(
      (total, check) =>
        total + (check.status === "pass" ? 100 : check.status === "warn" ? 50 : 0),
      0,
    ) / checks.length,
  );

  return { score, checks };
}
