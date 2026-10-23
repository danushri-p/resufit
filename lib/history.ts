import { z } from "zod";
import {
  JobRequirementsSchema,
  MatchResultSchema,
  InterviewPrepResultSchema,
  ResumeSchema,
  type AnalysisResult,
  CompareResultSchema,
} from "@/lib/schemas";

const HISTORY_KEY = "resufit:history";
const MAX_HISTORY_ENTRIES = 10;

const analysisResultSchema = z.object({
  resume: ResumeSchema,
  job: JobRequirementsSchema,
  match: MatchResultSchema,
  ats: MatchResultSchema.shape.ats,
  rewrites: z.array(
    z.object({
      projectName: z.string(),
      rewrites: z.array(
        z.object({
          original: z.string(),
          rewritten: z.string(),
          reason: z.string(),
        }),
      ),
    }),
  ).optional(),
  coverLetter: z.string().optional(),
  interviewPrep: InterviewPrepResultSchema.optional(),
});

const analysisHistoryEntrySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  fileName: z.string(),
  jobTitle: z.string(),
  company: z.string(),
  matchScore: z.number().min(0).max(100),
  atsScore: z.number().min(0).max(100),
  result: analysisResultSchema,
});

const comparisonHistoryEntrySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  type: z.literal("comparison"),
  fileName: z.string(),
  jobTitle: z.string(),
  company: z.string(),
  matchScore: z.number().min(0).max(100),
  atsScore: z.number().min(0).max(100),
  comparison: CompareResultSchema,
});

export const HistoryEntrySchema = z.union([
  analysisHistoryEntrySchema,
  comparisonHistoryEntrySchema,
]);

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type AnalysisHistoryEntry = z.infer<typeof analysisHistoryEntrySchema>;
export type ComparisonHistoryEntry = z.infer<typeof comparisonHistoryEntrySchema>;
export type HistoryEntryInput =
  | Omit<AnalysisHistoryEntry, "id" | "createdAt">
  | Omit<ComparisonHistoryEntry, "id" | "createdAt">;

function readEntries(): HistoryEntry[] {
  try {
    const value = localStorage.getItem(HISTORY_KEY);
    if (!value) return [];

    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => HistoryEntrySchema.safeParse(entry))
      .filter((entry) => entry.success)
      .map((entry) => entry.data)
      .sort((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      );
  } catch {
    return [];
  }
}

function writeEntries(entries: HistoryEntry[]): boolean {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)),
    );
    return true;
  } catch {
    return false;
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function saveHistoryEntry(entry: HistoryEntryInput): string | undefined {
  const parsed = HistoryEntrySchema.safeParse({
    ...entry,
    id: newId(),
    createdAt: new Date().toISOString(),
  });
  if (!parsed.success) return undefined;

  const entries = [parsed.data, ...readEntries()];
  writeEntries(entries);
  return parsed.data.id;
}

export function listHistoryEntries(): HistoryEntry[] {
  return readEntries();
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return readEntries().find((entry) => entry.id === id);
}

export function updateHistoryEntry(
  id: string,
  result: AnalysisResult,
): void {
  const entries = readEntries();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1 || "type" in entries[index]) return;

  const updated = HistoryEntrySchema.safeParse({
    ...entries[index],
    result,
    matchScore: result.match.score,
    atsScore: result.ats.score,
  });
  if (!updated.success) return;

  entries[index] = updated.data;
  writeEntries(entries);
}

export function deleteHistoryEntry(id: string): void {
  writeEntries(readEntries().filter((entry) => entry.id !== id));
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

/**
 * Imports already-validated entries. "merge" keeps existing entries and skips incoming
 * ids that already exist; "replace" discards current history first. Only the newest
 * MAX_HISTORY_ENTRIES are kept either way.
 */
export function importHistoryEntries(
  incoming: HistoryEntry[],
  mode: "merge" | "replace",
): ImportResult | undefined {
  const existing = mode === "merge" ? readEntries() : [];
  const existingIds = new Set(existing.map((entry) => entry.id));
  const fresh = incoming.filter((entry) => !existingIds.has(entry.id));
  const kept = [...existing, ...fresh]
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, MAX_HISTORY_ENTRIES);
  if (!writeEntries(kept)) return undefined;

  const keptIds = new Set(kept.map((entry) => entry.id));
  const imported = fresh.filter((entry) => keptIds.has(entry.id)).length;
  return { imported, skipped: incoming.length - imported };
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    return;
  }
}
