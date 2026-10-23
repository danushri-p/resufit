import { z } from "zod";
import { normalizeSkill } from "@/lib/matching/skills";
import { BulletRewritesSchema, ResumeSchema } from "@/lib/schemas";

export const BUILDER_INPUT_KEY = "resufit:resume-builder";
export const BUILDER_DRAFT_KEY = "resufit:resume-draft";

export const ResumeBuilderInputSchema = z.object({
  resume: ResumeSchema,
  rewrites: z
    .array(
      z.object({
        projectName: z.string(),
        rewrites: BulletRewritesSchema.shape.rewrites,
      }),
    )
    .default([]),
  matchedSkills: z.array(z.string()).default([]),
  jobTitle: z.string().nullable(),
  company: z.string().nullable(),
});

export type ResumeBuilderInput = z.infer<typeof ResumeBuilderInputSchema>;

const DraftBulletSchema = z.object({
  id: z.string(),
  original: z.string(),
  improved: z.string().nullable(),
  useImproved: z.boolean(),
  /** Text the user typed; null means "show the chosen version unchanged". */
  edited: z.string().nullable(),
});

export const ResumeDraftSchema = z.object({
  jobTitle: z.string().nullable(),
  company: z.string().nullable(),
  name: z.string(),
  contact: z.string(),
  summary: z.string(),
  skills: z.array(z.string()),
  matchedSkills: z.array(z.string()),
  matchingSkillsFirst: z.boolean(),
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      techStack: z.array(z.string()),
      bullets: z.array(DraftBulletSchema),
    }),
  ),
  experience: z.array(
    z.object({
      id: z.string(),
      heading: z.string(),
      dates: z.string(),
      bullets: z.array(DraftBulletSchema),
    }),
  ),
  education: z.array(z.string()),
  certifications: z.array(z.string()),
});

export type ResumeDraft = z.infer<typeof ResumeDraftSchema>;
export type DraftBullet = z.infer<typeof DraftBulletSchema>;

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function sameText(first: string, second: string): boolean {
  return first.trim().replace(/\s+/g, " ") === second.trim().replace(/\s+/g, " ");
}

/** Returns the skills with the job's matched skills first, keeping the original order otherwise. */
export function orderSkillsForJob(skills: string[], matchedSkills: string[]): string[] {
  const matched = new Set(matchedSkills.map(normalizeSkill));
  const first = skills.filter((skill) => matched.has(normalizeSkill(skill)));
  const rest = skills.filter((skill) => !matched.has(normalizeSkill(skill)));
  return [...first, ...rest];
}

export function createDraft(input: ResumeBuilderInput): ResumeDraft {
  const { resume } = input;
  return {
    jobTitle: input.jobTitle,
    company: input.company,
    name: clean(resume.name),
    contact: clean(resume.email),
    summary: clean(resume.summary),
    skills: resume.skills.map(clean).filter(Boolean),
    matchedSkills: input.matchedSkills,
    matchingSkillsFirst: true,
    projects: resume.projects.map((project, projectIndex) => {
      const name = clean(project.name);
      const projectRewrites =
        input.rewrites.find((entry) => sameText(entry.projectName, name))?.rewrites ?? [];
      return {
        id: `project-${projectIndex}`,
        name,
        description: clean(project.description),
        techStack: project.techStack.map(clean).filter(Boolean),
        bullets: project.bullets.map((bullet, bulletIndex) => {
          const rewrite = projectRewrites.find((entry) => sameText(entry.original, bullet));
          const improved =
            rewrite && !sameText(rewrite.rewritten, bullet) ? rewrite.rewritten.trim() : null;
          return {
            id: `project-${projectIndex}-bullet-${bulletIndex}`,
            original: bullet.trim(),
            improved,
            useImproved: improved !== null,
            edited: null,
          };
        }),
      };
    }),
    experience: resume.experience.map((entry, entryIndex) => ({
      id: `experience-${entryIndex}`,
      heading: [clean(entry.role), clean(entry.company)].filter(Boolean).join(", "),
      dates: [clean(entry.startDate), clean(entry.endDate)].filter(Boolean).join(" – "),
      bullets: entry.bullets.map((bullet, bulletIndex) => ({
        id: `experience-${entryIndex}-bullet-${bulletIndex}`,
        original: bullet.trim(),
        improved: null,
        useImproved: false,
        edited: null,
      })),
    })),
    education: resume.education
      .map((entry) =>
        [clean(entry.degree), clean(entry.institution), clean(entry.year)]
          .filter(Boolean)
          .join(", "),
      )
      .filter(Boolean),
    certifications: resume.certifications.map(clean).filter(Boolean),
  };
}

export function bulletText(bullet: DraftBullet): string {
  if (bullet.edited !== null) return bullet.edited;
  return bullet.useImproved && bullet.improved ? bullet.improved : bullet.original;
}

export function displayedSkills(draft: ResumeDraft): string[] {
  return draft.matchingSkillsFirst
    ? orderSkillsForJob(draft.skills, draft.matchedSkills)
    : draft.skills;
}

export function moveItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return items;
  }
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function countImprovedBullets(draft: ResumeDraft): { available: number; used: number } {
  const bullets = draft.projects.flatMap((project) => project.bullets);
  const withImprovement = bullets.filter((bullet) => bullet.improved !== null);
  return {
    available: withImprovement.length,
    used: withImprovement.filter((bullet) => bullet.useImproved && bullet.edited === null).length,
  };
}

/** Plain-text resume: single column, standard headings, no tables, so ATS parsers read it reliably. */
export function draftToPlainText(draft: ResumeDraft): string {
  const lines: string[] = [];
  const section = (title: string, body: string[]) => {
    const content = body.filter((line) => line.trim());
    if (!content.length) return;
    lines.push("", title.toUpperCase(), ...content);
  };
  const bullets = (items: DraftBullet[]) =>
    items.map(bulletText).map((text) => text.trim()).filter(Boolean).map((text) => `- ${text}`);

  if (draft.name) lines.push(draft.name);
  if (draft.contact) lines.push(draft.contact);
  section("Summary", [draft.summary]);
  const skills = displayedSkills(draft);
  section("Skills", skills.length ? [skills.join(", ")] : []);
  section(
    "Projects",
    draft.projects.flatMap((project, index) => [
      ...(index > 0 ? [""] : []),
      [project.name, project.description].filter(Boolean).join(" — "),
      ...(project.techStack.length ? [`Tech: ${project.techStack.join(", ")}`] : []),
      ...bullets(project.bullets),
    ]),
  );
  section(
    "Experience",
    draft.experience.flatMap((entry, index) => [
      ...(index > 0 ? [""] : []),
      [entry.heading, entry.dates && `(${entry.dates})`].filter(Boolean).join(" "),
      ...bullets(entry.bullets),
    ]),
  );
  section("Education", draft.education);
  section("Certifications", draft.certifications.map((item) => `- ${item}`));
  return `${lines.join("\n").trim()}\n`;
}

export function resumeFileName(draft: ResumeDraft): string {
  const slug = [draft.name || "resume", draft.jobTitle ?? ""]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "resume"}-resufit.txt`;
}

function readSession<T>(key: string, schema: z.ZodType<T>): T | undefined {
  try {
    const value = sessionStorage.getItem(key);
    if (!value) return undefined;
    const parsed = schema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function writeSession(key: string, value: unknown): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Stores a fresh builder input and discards any previous draft. */
export function startResumeBuilder(input: ResumeBuilderInput): boolean {
  try {
    sessionStorage.removeItem(BUILDER_DRAFT_KEY);
  } catch {
    // Ignore; writeSession reports failure below.
  }
  return writeSession(BUILDER_INPUT_KEY, input);
}

export function loadResumeDraft(): ResumeDraft | undefined {
  const draft = readSession(BUILDER_DRAFT_KEY, ResumeDraftSchema);
  if (draft) return draft;
  const input = readSession(BUILDER_INPUT_KEY, ResumeBuilderInputSchema);
  return input ? createDraft(input) : undefined;
}

export function saveResumeDraft(draft: ResumeDraft): void {
  writeSession(BUILDER_DRAFT_KEY, draft);
}
