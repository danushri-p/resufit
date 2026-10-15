import { cleanSkillArray, generateStructured } from "@/lib/ai/client";
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

export function extractResume(resumeText: string): Promise<Resume> {
  const resumeLines = resumeText.split(/\r?\n/);

  return generateStructured({
    prompt: RESUME_EXTRACTION_PROMPT,
    schema: ResumeSchema,
    sourceText: resumeText,
  }).then((resume) => ({
    ...resume,
    skills: cleanSkillArray(resume.skills),
    experience: resume.experience.filter(
      ({ role, company }) => Boolean(role?.trim() || company?.trim()),
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
  }));
}
