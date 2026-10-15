import { generateStructured } from "@/lib/ai/client";
import { RESUME_SUGGESTIONS_PROMPT } from "@/lib/ai/prompts";
import {
  SuggestionsSchema,
  type JobRequirements,
  type Resume,
} from "@/lib/schemas";
import { shouldDropSuggestion } from "@/lib/ai/guards";

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function listSection(label: string, values: string[]): string[] {
  const items = values.map(text).filter((value): value is string => Boolean(value));
  return items.length > 0 ? [label, ...items.map((item) => `- ${item}`)] : [];
}

function buildSuggestionContext(
  resume: Resume,
  job: JobRequirements,
  matchedSkills: string[],
  missingMustHave: string[],
  missingNiceToHave: string[],
): { userMessage: string; resumeText: string } {
  const jobTitle = text(job.jobTitle);
  const jobLines = [
    jobTitle ? `Job title: ${jobTitle}` : "",
    ...listSection("Must-have skills:", job.mustHaveSkills),
    ...listSection("Nice-to-have skills:", job.niceToHaveSkills),
    ...listSection("Responsibilities:", job.responsibilities),
  ].filter(Boolean);

  const projects = resume.projects.flatMap((project) => {
    const name = text(project.name);
    if (!name) {
      return [];
    }

    const lines = [
      ...listSection("Tech stack:", project.techStack),
      ...listSection("Bullets:", project.bullets),
    ].filter((line): line is string => Boolean(line));
    return [`Project: ${name}`, ...lines];
  });

  const experience = resume.experience.flatMap((entry) => {
    const role = text(entry.role);
    const company = text(entry.company);
    const description = [role, company].filter(Boolean).join(" at ");
    const lines = [
      description ? `Experience: ${description}` : "",
      ...listSection("Bullets:", entry.bullets),
    ].filter(Boolean);
    return lines;
  });

  const education = resume.education
    .map((entry) =>
      [text(entry.degree), text(entry.institution), text(entry.year)]
        .filter(Boolean)
        .join(" · "),
    )
    .filter(Boolean);

  const resumeText = [
    ...listSection("Skills:", resume.skills),
    ...projects,
    ...experience,
    ...listSection("Education:", education),
    ...listSection("Skills the candidate HAS that match:", matchedSkills),
    ...listSection(
      "Must-have skills the candidate does NOT have:",
      missingMustHave,
    ),
    ...listSection(
      "Nice-to-have skills the candidate does NOT have:",
      missingNiceToHave,
    ),
  ];

  const userMessage = [
    ...(jobLines.length > 0 ? ["Job:", ...jobLines] : []),
    ...(resumeText.length > 0 ? ["Resume:", ...resumeText] : []),
  ].join("\n");

  return { userMessage, resumeText: resumeText.join("\n") };
}

export function suggestResumeImprovements(
  resume: Resume,
  job: JobRequirements,
  matchedSkills: string[],
  missingMustHave: string[],
  missingNiceToHave: string[],
) {
  const { userMessage, resumeText } = buildSuggestionContext(
    resume,
    job,
    matchedSkills,
    missingMustHave,
    missingNiceToHave,
  );
  const deterministicSuggestion = missingMustHave[0]
    ? (() => {
        const skill = missingMustHave[0];
        const firstProject = text(resume.projects[0]?.name);
        return {
          title: `Learn ${skill}`,
          detail: `This job requires ${skill}, which isn't on your resume yet. Build a small project with ${skill}${firstProject ? ` (for example, add it to ${firstProject})` : ""} so you can honestly list it.`,
        };
      })()
    : undefined;

  return generateStructured({
    prompt: RESUME_SUGGESTIONS_PROMPT,
    schema: SuggestionsSchema,
    sourceText: userMessage,
    userMessage,
  }).then((result) => ({
    suggestions: [
      ...(deterministicSuggestion ? [deterministicSuggestion] : []),
      ...result.suggestions
        .filter(
          (suggestion) => {
            const duplicatesDeterministicSuggestion =
              deterministicSuggestion &&
              suggestion.title.trim().toLowerCase() ===
                deterministicSuggestion.title.toLowerCase();
            return (
              !duplicatesDeterministicSuggestion &&
              !shouldDropSuggestion(suggestion, resumeText, [
                ...missingMustHave,
                ...missingNiceToHave,
              ])
            );
          },
        )
        .slice(0, deterministicSuggestion ? 4 : 5),
    ],
  }));
}
