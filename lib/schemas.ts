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

export const ExtractionSchema = z.object({
  resume: ResumeSchema,
  job: JobRequirementsSchema,
});

export type Extraction = z.infer<typeof ExtractionSchema>;

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

export const CoverLetterSchema = z.object({
  greeting: z.string(),
  paragraphs: z.array(z.string()).min(3).max(4),
  closing: z.string(),
});

export const InterviewQuestionSchema = z.object({
  category: z.enum(["technical", "gap", "project", "behavioral"]),
  question: z.string(),
  whyAsked: z.string(),
  answerOutline: z.array(z.string()).min(2).max(4),
  basedOn: z.string().nullable(),
});

export const InterviewPrepSchema = z.object({
  questions: z.array(InterviewQuestionSchema).min(8).max(10),
});

export const InterviewPrepResultSchema = z.object({
  questions: z.array(InterviewQuestionSchema).min(5).max(10),
  warnings: z.array(z.string()),
});

export const MatchResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  label: z.enum(["Strong match", "Good match", "Partial match", "Weak match"]),
  matchedMustHave: z.array(z.string()),
  missingMustHave: z.array(z.string()),
  matchedNiceToHave: z.array(z.string()),
  missingNiceToHave: z.array(z.string()),
  suggestions: SuggestionsSchema.shape.suggestions,
  ats: z.object({
    score: z.number().int().min(0).max(100),
    checks: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        status: z.enum(["pass", "warn", "fail"]),
        detail: z.string(),
      }),
    ),
  }),
});

export const JobComparisonSchema = z.object({
  index: z.number().int().min(0).max(2),
  job: JobRequirementsSchema.optional(),
  match: MatchResultSchema.optional(),
  atsKeywordCoverage: z.number().int().min(0).max(100).optional(),
  error: z.string().optional(),
});

export const SkillGapSchema = z.object({
  skill: z.string(),
  missingIn: z.number().int().min(1).max(3),
  jobTitles: z.array(z.string()),
});

export const CompareResultSchema = z.object({
  resume: ResumeSchema,
  jobs: z.array(JobComparisonSchema).min(2).max(3),
  skillGaps: z.array(SkillGapSchema),
});

export type JobComparison = z.infer<typeof JobComparisonSchema>;
export type SkillGap = z.infer<typeof SkillGapSchema>;
export type CompareResult = z.infer<typeof CompareResultSchema>;

export type Resume = z.infer<typeof ResumeSchema>;
export type JobRequirements = z.infer<typeof JobRequirementsSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;
export type BulletRewrite = z.infer<
  typeof BulletRewritesSchema
>["rewrites"][number];
export type CoverLetter = z.infer<typeof CoverLetterSchema>;
export type InterviewPrep = z.infer<typeof InterviewPrepSchema>;
export type InterviewPrepResult = z.infer<typeof InterviewPrepResultSchema>;
export interface ProjectBulletRewrites {
  projectName: string;
  rewrites: BulletRewrite[];
}
export type AtsResult = z.infer<typeof MatchResultSchema>["ats"];
export type AnalysisResult = {
  resume: Resume;
  job: JobRequirements;
  match: MatchResult;
  ats: AtsResult;
  rewrites?: ProjectBulletRewrites[];
  coverLetter?: string;
  interviewPrep?: InterviewPrepResult;
};
