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

export type Resume = z.infer<typeof ResumeSchema>;
export type JobRequirements = z.infer<typeof JobRequirementsSchema>;
