import { generateStructured } from "@/lib/ai/client";
import { canUseRewrite } from "@/lib/ai/guards";
import { BULLET_REWRITE_PROMPT } from "@/lib/ai/prompts";
import {
  BulletRewritesSchema,
  type JobRequirements,
  type ProjectBulletRewrites,
  type Resume,
} from "@/lib/schemas";

const COMMON_TECHNOLOGIES = [
  "AWS",
  "AWS Cognito",
  "AWS Lambda",
  "Azure",
  "C#",
  "Docker",
  "Docker Compose",
  "EC2",
  "Express",
  "Firebase",
  "Git",
  "GitHub Actions",
  "GCP",
  "GraphQL",
  "Java",
  "JavaScript",
  "Jenkins",
  "Kubernetes",
  "MongoDB",
  "MySQL",
  "Next.js",
  "Node.js",
  "PostgreSQL",
  "Python",
  "React",
  "Redis",
  "REST API",
  "S3",
  "Supabase",
  "Terraform",
  "TypeScript",
];

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function listSection(label: string, values: string[]): string[] {
  const items = values.map(text).filter((value): value is string => Boolean(value));
  return items.length > 0 ? [label, ...items.map((item) => `- ${item}`)] : [];
}

function buildRewriteContext(
  resume: Resume,
  job: JobRequirements,
  matchedSkills: string[],
  missingSkills: string[],
): string {
  const jobTitle = text(job.jobTitle);
  const projects = resume.projects.flatMap((project) => {
    const name = text(project.name);
    if (!name) return [];

    return [
      `Project: ${name}`,
      ...listSection("Tech stack:", project.techStack),
      ...listSection("Bullets:", project.bullets),
    ];
  });

  return [
    ...(jobTitle ? [`Job title: ${jobTitle}`] : []),
    ...listSection("Must-have skills:", job.mustHaveSkills),
    ...listSection("Matched skills:", matchedSkills),
    ...listSection("Missing skills:", missingSkills),
    ...(projects.length > 0 ? ["Projects:", ...projects] : []),
  ].join("\n");
}

export async function rewriteBullets(
  resume: Resume,
  job: JobRequirements,
  matchedSkills: string[],
  missingSkills: string[],
): Promise<ProjectBulletRewrites[]> {
  const sourceText = buildRewriteContext(resume, job, matchedSkills, missingSkills);
  const knownTechnologies = [
    ...resume.skills,
    ...resume.projects.flatMap((project) => project.techStack),
    ...job.mustHaveSkills,
    ...job.niceToHaveSkills,
    ...matchedSkills,
    ...missingSkills,
    ...COMMON_TECHNOLOGIES,
  ];
  const { rewrites } = await generateStructured({
    prompt: BULLET_REWRITE_PROMPT,
    schema: BulletRewritesSchema,
    sourceText,
    userMessage: sourceText,
  });

  return resume.projects.flatMap((project) => {
    const projectName = text(project.name);
    if (!projectName) return [];

    const projectRewrites = project.bullets.map((original) => {
      const modelRewrite = rewrites.find((rewrite) => rewrite.original === original);
      const candidate = modelRewrite
        ? {
            ...modelRewrite,
            rewritten: modelRewrite.rewritten.trim(),
            reason: modelRewrite.reason.trim(),
          }
        : undefined;
      if (
        candidate &&
        canUseRewrite(
          candidate,
          project.techStack,
          missingSkills,
          knownTechnologies,
        )
      ) {
        return candidate;
      }

      return { original, rewritten: original, reason: "Kept as is" };
    });

    return [{ projectName, rewrites: projectRewrites }];
  });
}
