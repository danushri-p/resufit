import { z } from "zod";
import {
  HistoryEntrySchema,
  clearHistory,
  importHistoryEntries,
  listHistoryEntries,
  type HistoryEntry,
} from "@/lib/history";
import {
  ApplicationSchema,
  clearApplications,
  importApplications,
  listApplications,
  type Application,
} from "@/lib/tracker";
import {
  LearningProgressSchema,
  clearLearningProgress,
  importLearningProgress,
  readLearningProgress,
  type LearningProgress,
} from "@/lib/learning";

export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const SESSION_KEYS = [
  "resufit:compare-prefill",
  "resufit:resume-builder",
  "resufit:resume-draft",
];

const BackupFileSchema = z.object({
  app: z.literal("resufit"),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  history: z.array(z.unknown()),
  applications: z.array(z.unknown()),
  // Added after the first backup format; optional so older backups still restore.
  learning: z.unknown().optional(),
});

export interface Backup {
  app: "resufit";
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  history: HistoryEntry[];
  applications: Application[];
  learning: LearningProgress;
}

export type ParsedBackup =
  | {
      success: true;
      backup: Backup;
      /** Entries that failed validation and will not be restored. */
      invalidCount: number;
    }
  | { success: false; error: string };

export interface RestoreSummary {
  history: { imported: number; skipped: number };
  applications: { imported: number; skipped: number };
  learning: { imported: number };
}

export function createBackup(now: Date = new Date()): Backup {
  return {
    app: "resufit",
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    history: listHistoryEntries(),
    applications: listApplications(),
    learning: readLearningProgress(),
  };
}

export function backupFileName(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `resufit-backup-${now.getFullYear()}-${month}-${day}.json`;
}

export function parseBackup(text: string): ParsedBackup {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) {
    return { success: false, error: "This file is larger than 5 MB, so it isn't a ResuFit backup." };
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { success: false, error: "This file isn't valid JSON. Choose a ResuFit backup file." };
  }

  const file = BackupFileSchema.safeParse(json);
  if (!file.success) {
    const isOtherVersion =
      typeof json === "object" &&
      json !== null &&
      "app" in json &&
      json.app === "resufit" &&
      "version" in json &&
      json.version !== BACKUP_VERSION;
    return {
      success: false,
      error: isOtherVersion
        ? "This backup was made by a different version of ResuFit and can't be restored here."
        : "This file isn't a ResuFit backup.",
    };
  }

  const history = file.data.history
    .map((entry) => HistoryEntrySchema.safeParse(entry))
    .filter((entry) => entry.success)
    .map((entry) => entry.data);
  const applications = file.data.applications
    .map((entry) => ApplicationSchema.safeParse(entry))
    .filter((entry) => entry.success)
    .map((entry) => entry.data);
  const learning = LearningProgressSchema.safeParse(file.data.learning ?? {});

  return {
    success: true,
    backup: {
      app: "resufit",
      version: BACKUP_VERSION,
      exportedAt: file.data.exportedAt,
      history,
      applications,
      learning: learning.success ? learning.data : {},
    },
    invalidCount:
      file.data.history.length -
      history.length +
      file.data.applications.length -
      applications.length,
  };
}

export function restoreBackup(
  backup: Backup,
  mode: "merge" | "replace",
): RestoreSummary | undefined {
  const history = importHistoryEntries(backup.history, mode);
  const applications = importApplications(backup.applications, mode);
  const learning = importLearningProgress(backup.learning, mode);
  if (!history || !applications || !learning) return undefined;
  return { history, applications, learning };
}

export function deleteAllData(): void {
  clearHistory();
  clearApplications();
  clearLearningProgress();
  try {
    for (const key of SESSION_KEYS) sessionStorage.removeItem(key);
  } catch {
    return;
  }
}
