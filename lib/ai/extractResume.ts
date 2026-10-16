import { cleanSkillArray, generateStructured } from "@/lib/ai/client";
import { cacheAIResult } from "@/lib/ai/cache";
import { RESUME_EXTRACTION_PROMPT } from "@/lib/ai/prompts";
import { ResumeSchema, type Resume } from "@/lib/schemas";

function normalizeBulletLine(line: string): string {
  return line
    .replace(/^\s*[-•*]\s*/, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function restoreBullet(bullet: string, resumeLines: string[]): string {
  const normalizedBullet = normalizeBulletLine(bullet);
  if (!normalizedBullet) return bullet;

  const sourceLine = resumeLines.find((line) =>
    normalizeBulletLine(line).startsWith(normalizedBullet),
  );
  return sourceLine?.replace(/^\s*[-•*]\s*/, "").trim() ?? bullet;
}

function resumeContainsExperienceLabel(
  resumeText: string,
  label: string | null,
): boolean {
  const normalizedLabel = label
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (!normalizedLabel) return false;

  const normalizedResume = ` ${resumeText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")} `;

  return normalizedResume.includes(` ${normalizedLabel} `);
}

export function postProcessResume(
  resume: Resume,
  resumeText: string,
): Resume {
  const resumeLines = resumeText.split(/\r?\n/);

  return {
    ...resume,
    skills: cleanSkillArray(resume.skills),
    experience: resume.experience.filter(
      ({ role, company }) => Boolean(role?.trim() || company?.trim()),
    ).filter(({ role, company }) =>
      resumeContainsExperienceLabel(resumeText, company) ||
      resumeContainsExperienceLabel(resumeText, role),
    ).map((experience) => ({
      ...experience,
      bullets: experience.bullets.map((bullet) =>
        restoreBullet(bullet, resumeLines),
      ),
    })),
    education: resume.education.filter(
      ({ degree, institution }) =>
        Boolean(degree?.trim() || institution?.trim()),
    ),
    projects: resume.projects
      .filter(({ name }) => Boolean(name?.trim()))
      .map((project) => ({
        ...project,
        techStack: cleanSkillArray(project.techStack),
        bullets: project.bullets.map((bullet) =>
          restoreBullet(bullet, resumeLines),
        ),
      })),
  };
}

export function extractResume(resumeText: string): Promise<Resume> {
  return cacheAIResult("resume-extraction-v1", resumeText, async () => {
    const resume = await generateStructured({
      prompt: RESUME_EXTRACTION_PROMPT,
      schema: ResumeSchema,
      sourceText: resumeText,
    });
    return postProcessResume(resume, resumeText);
  });
}
