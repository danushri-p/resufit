import { cleanSkillArray, extractWithOllama } from "@/lib/ai/client";
import { RESUME_EXTRACTION_PROMPT } from "@/lib/ai/prompts";
import { ResumeSchema, type Resume } from "@/lib/schemas";

export function extractResume(resumeText: string): Promise<Resume> {
  return extractWithOllama({
    prompt: RESUME_EXTRACTION_PROMPT,
    schema: ResumeSchema,
    sourceText: resumeText,
  }).then((resume) => ({
    ...resume,
    skills: cleanSkillArray(resume.skills),
    experience: resume.experience.filter(
      ({ role, company }) => Boolean(role?.trim() || company?.trim()),
    ),
    education: resume.education.filter(
      ({ degree, institution }) =>
        Boolean(degree?.trim() || institution?.trim()),
    ),
    projects: resume.projects
      .filter(({ name }) => Boolean(name?.trim()))
      .map((project) => ({
        ...project,
        techStack: cleanSkillArray(project.techStack),
      })),
  }));
}
