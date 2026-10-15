import { z } from "zod";

const optionalText = z.string().nullable();

export const ResumeSchema = z.object({
  name: optionalText,
  email: optionalText,
  summary: optionalText,
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      role: optionalText,
      company: optionalText,
      startDate: optionalText,
      endDate: optionalText,
      bullets: z.array(z.string()),
    }),
  ),
  projects: z.array(
    z.object({
      name: optionalText,
      description: optionalText,
      techStack: z.array(z.string()),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      degree: optionalText,
      institution: optionalText,
      year: optionalText,
    }),
  ),
  certifications: z.array(z.string()),
});

export const JobRequirementsSchema = z.object({
  jobTitle: optionalText,
  company: optionalText,
  mustHaveSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  yearsOfExperience: z.number().nullable(),
  responsibilities: z.array(z.string()),
  keywords: z.array(z.string()),
});

export const SuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
    }),
  ),
});

export const BulletRewritesSchema = z.object({
  rewrites: z.array(
    z.object({
      original: z.string(),
      rewritten: z.string(),
      reason: z.string(),
    }),
  ),
});

export const MatchResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  label: z.enum(["Strong match", "Good match", "Partial match", "Weak match"]),
  matchedMustHave: z.array(z.string()),
  missingMustHave: z.array(z.string()),
  matchedNiceToHave: z.array(z.string()),
  missingNiceToHave: z.array(z.string()),
  suggestions: SuggestionsSchema.shape.suggestions,
});

export type Resume = z.infer<typeof ResumeSchema>;
export type JobRequirements = z.infer<typeof JobRequirementsSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;
export type BulletRewrite = z.infer<
  typeof BulletRewritesSchema
>["rewrites"][number];
export interface ProjectBulletRewrites {
  projectName: string;
  rewrites: BulletRewrite[];
}
