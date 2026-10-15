import { extractWithOllama } from "@/lib/ai/client";
import { RESUME_SUGGESTIONS_PROMPT } from "@/lib/ai/prompts";
import {
  SuggestionsSchema,
  type JobRequirements,
  type Resume,
} from "@/lib/schemas";
import { normalizeSkill } from "@/lib/matching/skills";

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

function containsUnsupportedNumbers(
  suggestion: { title: string; detail: string },
  resumeText: string,
): boolean {
  const content = `${suggestion.title}\n${suggestion.detail}`.replace(
    /\[(?:x%?|number)\]/gi,
    "",
  );

  if (/\d+(?:[.,]\d+)*\s*(?:%|percent\b)/i.test(content)) {
    return true;
  }

  const resumeNumbers = new Set(
    resumeText.match(/\d+(?:[.,]\d+)*(?:\+)?/g)?.map((number) =>
      number.replace(/,/g, ""),
    ) ?? [],
  );
  const suggestionNumbers =
    content.match(/\d+(?:[.,]\d+)*(?:\+)?/g) ?? [];

  return suggestionNumbers.some(
    (number) => !resumeNumbers.has(number.replace(/,/g, "")),
  );
}

function mentionsMissingSkill(content: string, missingSkills: string[]): boolean {
  const words =
    content.match(/[\p{L}\p{N}+#]+(?:\.[\p{L}\p{N}+#]+)*/gu) ?? [];
  const normalizedMissingSkills = new Set(
    missingSkills.map(normalizeSkill).filter(Boolean),
  );

  for (let start = 0; start < words.length; start += 1) {
    for (let end = start + 1; end <= Math.min(start + 5, words.length); end += 1) {
      if (normalizedMissingSkills.has(normalizeSkill(words.slice(start, end).join(" ")))) {
        return true;
      }
    }
  }

  return false;
}

function containsLearningPhrase(content: string): boolean {
  return /\b(?:learn|build a|practice|course|tutorial|side project)\b/i.test(
    content,
  );
}

function repeatsQuotedText(detail: string): boolean {
  const quotedText = Array.from(
    detail.matchAll(/["'`]([^"'`]+)["'`]|“([^”]+)”|‘([^’]+)’/g),
    (match) => (match[1] ?? match[2] ?? match[3]).trim().toLowerCase(),
  );

  return new Set(quotedText).size < quotedText.length;
}

function hasDishonestSkillClaim(
  suggestion: { title: string; detail: string },
  missingSkills: string[],
): boolean {
  const content = `${suggestion.title}\n${suggestion.detail}`;
  return (
    (mentionsMissingSkill(content, missingSkills) &&
      !containsLearningPhrase(content)) ||
    repeatsQuotedText(suggestion.detail)
  );
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

  return extractWithOllama({
    prompt: RESUME_SUGGESTIONS_PROMPT,
    schema: SuggestionsSchema,
    sourceText: userMessage,
    userMessage,
  }).then((result) => ({
    suggestions: [
      ...(deterministicSuggestion ? [deterministicSuggestion] : []),
      ...result.suggestions
        .filter(
          (suggestion) =>
            !containsUnsupportedNumbers(suggestion, resumeText) &&
            !hasDishonestSkillClaim(suggestion, [
              ...missingMustHave,
              ...missingNiceToHave,
            ]),
        )
        .slice(0, deterministicSuggestion ? 4 : 5),
    ],
  }));
}
