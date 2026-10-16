import type {
  JobRequirements,
  MatchResult,
  ProjectBulletRewrites,
  InterviewPrepResult,
  Resume,
} from "@/lib/schemas";

interface MarkdownReportOptions {
  fileName: string;
  resume: Resume;
  job: JobRequirements;
  match: MatchResult;
  rewrites?: ProjectBulletRewrites[];
  coverLetter?: string;
  interviewPrep?: InterviewPrepResult;
}

const interviewCategoryTitles = {
  technical: "Technical",
  gap: "Skill gaps",
  project: "Your projects",
  behavioral: "Behavioral",
} as const;

export function buildInterviewPrepMarkdown(
  interviewPrep: InterviewPrepResult,
): string {
  return [
    ...Object.entries(interviewCategoryTitles).flatMap(([category, title]) => {
      const questions = interviewPrep.questions.filter(
        (question) => question.category === category,
      );
      if (!questions.length) return [];
      return [
        `## ${title}`,
        ...questions.map((question) =>
          [
            `### ${question.question}`,
            `**Why they ask:** ${question.whyAsked}`,
            ...(question.basedOn ? [`**Based on:** ${question.basedOn}`] : []),
            ...question.answerOutline.map((bullet) => `- ${bullet}`),
          ].join("\n"),
        ),
      ];
    }),
    ...(interviewPrep.warnings.length
      ? ["## Accuracy notes", ...interviewPrep.warnings.map((warning) => `- ${warning}`)]
      : []),
  ].join("\n\n");
}

function skillList(skills: string[]): string {
  return skills.length > 0 ? skills.map((skill) => `- ${skill}`).join("\n") : "- None";
}

export function buildMarkdownReport({
  fileName,
  resume,
  job,
  match,
  rewrites,
  coverLetter,
  interviewPrep,
}: MarkdownReportOptions): string {
  const jobTitle = job.jobTitle?.trim() || "Job match report";
  const suggestions = match.suggestions.length > 0
    ? match.suggestions
        .map((suggestion, index) => `${index + 1}. **${suggestion.title}** — ${suggestion.detail}`)
        .join("\n")
    : "No suggestions.";
  const improvedBullets = rewrites?.length
    ? [
        "## Improved bullets",
        ...rewrites.flatMap((project) => [
          `### ${project.projectName}`,
          ...project.rewrites.map(
            ({ original, rewritten, reason }) =>
              `- **Original:** ${original}\n  **Rewritten:** ${rewritten}\n  **Reason:** ${reason}`,
          ),
        ]),
      ].join("\n\n")
    : "";
  const coverLetterSection = coverLetter?.trim()
    ? `## Cover letter\n\n${coverLetter.trim()}`
    : "";
  const interviewPrepSection = interviewPrep?.questions.length
    ? `## Interview prep\n\n${buildInterviewPrepMarkdown(interviewPrep)}`
    : "";

  return [
    `# ${jobTitle} resume report`,
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    `Resume: ${fileName}`,
    ...(resume.name ? [`Candidate: ${resume.name}`] : []),
    `Job: ${jobTitle}${job.company ? ` at ${job.company}` : ""}`,
    `## Match score: ${match.score}/100 — ${match.label}`,
    `## ATS score: ${match.ats.score}/100`,
    ...match.ats.checks.flatMap((check) => [
      `### ${check.label} — ${check.status.toUpperCase()}`,
      check.detail,
    ]),
    "## Must-have skills",
    "### Matched",
    skillList(match.matchedMustHave),
    "### Missing",
    skillList(match.missingMustHave),
    "## Nice-to-have skills",
    "### Matched",
    skillList(match.matchedNiceToHave),
    "### Missing",
    skillList(match.missingNiceToHave),
    "## Suggestions",
    suggestions,
    improvedBullets,
    coverLetterSection,
    interviewPrepSection,
  ]
    .filter(Boolean)
    .join("\n\n");
}
