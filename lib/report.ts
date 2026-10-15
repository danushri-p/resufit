import type {
  JobRequirements,
  MatchResult,
  ProjectBulletRewrites,
  Resume,
} from "@/lib/schemas";

interface MarkdownReportOptions {
  fileName: string;
  resume: Resume;
  job: JobRequirements;
  match: MatchResult;
  rewrites?: ProjectBulletRewrites[];
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
  ]
    .filter(Boolean)
    .join("\n\n");
}
