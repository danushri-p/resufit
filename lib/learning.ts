import { z } from "zod";
import type { HistoryEntry } from "@/lib/history";
import { findLearningResource, practiceIdea, type ResolvedResource } from "@/lib/learningResources";
import { normalizeSkill } from "@/lib/matching/skills";

export const LEARNING_KEY = "resufit:learning";

export const LEARNING_STATUSES = ["not-started", "learning", "done"] as const;
export type LearningStatus = (typeof LEARNING_STATUSES)[number];

export const LearningProgressSchema = z.record(
  z.string().min(1),
  z.object({
    status: z.enum(["learning", "done"]),
    updatedAt: z.string(),
  }),
);
export type LearningProgress = z.infer<typeof LearningProgressSchema>;

export interface LearningPlanItem {
  /** Normalized skill, used as the progress key so "React.js" and "React" share progress. */
  key: string;
  skill: string;
  priority: "must" | "nice";
  reason: string;
  resource: ResolvedResource;
  practice: string;
}

function pickProject(entry: HistoryEntry): string | null {
  const resume = "type" in entry ? entry.comparison.resume : entry.result.resume;
  return resume.projects.find((project) => project.name?.trim())?.name?.trim() ?? null;
}

export function buildLearningPlan(entry: HistoryEntry): LearningPlanItem[] {
  const project = pickProject(entry);
  const items: LearningPlanItem[] = [];
  const seen = new Set<string>();
  const add = (skill: string, priority: LearningPlanItem["priority"], reason: string) => {
    const key = normalizeSkill(skill);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const resource = findLearningResource(skill.trim());
    items.push({
      key,
      skill: skill.trim(),
      priority,
      reason,
      resource,
      practice: practiceIdea(skill.trim(), resource.kind, project),
    });
  };

  if ("type" in entry) {
    const jobCount = entry.comparison.jobs.filter((job) => job.match).length;
    for (const gap of entry.comparison.skillGaps) {
      add(
        gap.skill,
        "must",
        `Required by ${gap.missingIn} of ${jobCount} ${jobCount === 1 ? "job" : "jobs"}: ${gap.jobTitles.join(", ")}`,
      );
    }
  } else {
    const job = entry.jobTitle || "this job";
    for (const skill of entry.result.match.missingMustHave) add(skill, "must", `Required by ${job}`);
    for (const skill of entry.result.match.missingNiceToHave) add(skill, "nice", `Preferred by ${job}`);
  }
  return items;
}

export function readLearningProgress(): LearningProgress {
  try {
    const value = localStorage.getItem(LEARNING_KEY);
    if (!value) return {};
    const parsed = LearningProgressSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

function writeLearningProgress(progress: LearningProgress): boolean {
  try {
    if (Object.keys(progress).length === 0) localStorage.removeItem(LEARNING_KEY);
    else localStorage.setItem(LEARNING_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function getSkillStatus(progress: LearningProgress, key: string): LearningStatus {
  return progress[key]?.status ?? "not-started";
}

export function setSkillStatus(key: string, status: LearningStatus): LearningProgress {
  const progress = readLearningProgress();
  if (status === "not-started") delete progress[key];
  else progress[key] = { status, updatedAt: new Date().toISOString() };
  writeLearningProgress(progress);
  return progress;
}

/** Merge keeps existing statuses; replace swaps the progress for the incoming one. */
export function importLearningProgress(
  incoming: LearningProgress,
  mode: "merge" | "replace",
): { imported: number } | undefined {
  const existing = mode === "merge" ? readLearningProgress() : {};
  let imported = 0;
  for (const [key, value] of Object.entries(incoming)) {
    if (existing[key]) continue;
    existing[key] = value;
    imported += 1;
  }
  return writeLearningProgress(existing) ? { imported } : undefined;
}

export function clearLearningProgress(): void {
  try {
    localStorage.removeItem(LEARNING_KEY);
  } catch {
    return;
  }
}
