import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  backupFileName,
  createBackup,
  deleteAllData,
  parseBackup,
  restoreBackup,
} from "@/lib/backup";
import { listHistoryEntries, saveHistoryEntry, type HistoryEntryInput } from "@/lib/history";
import { listApplications, saveApplication, type ApplicationInput } from "@/lib/tracker";
import { readLearningProgress, setSkillStatus } from "@/lib/learning";
import { emptyAts, makeJob, makeResume } from "@/tests/fixtures";

function storageMock() {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

let local = storageMock();
let session = storageMock();

function historyInput(index: number): HistoryEntryInput {
  const match = {
    score: index,
    label: "Weak match" as const,
    matchedMustHave: [],
    missingMustHave: [],
    matchedNiceToHave: [],
    missingNiceToHave: [],
    suggestions: [],
    ats: emptyAts,
  };
  return {
    fileName: `resume-${index}.pdf`,
    jobTitle: `Job ${index}`,
    company: "",
    matchScore: index,
    atsScore: 0,
    result: { resume: makeResume(), job: makeJob(), match, ats: emptyAts },
  };
}

function applicationInput(role: string): ApplicationInput {
  return {
    role,
    company: "BrightPath Studio",
    status: "saved",
    appliedOn: null,
    followUpOn: null,
    jobUrl: null,
    notes: "",
    matchScore: null,
    historyId: null,
  };
}

beforeEach(() => {
  local = storageMock();
  session = storageMock();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("sessionStorage", session);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("backup", () => {
  it("round-trips history and applications through a backup file", () => {
    saveHistoryEntry(historyInput(1));
    saveApplication(applicationInput("Frontend Developer"));
    const text = JSON.stringify(createBackup());

    deleteAllData();
    expect(listHistoryEntries()).toEqual([]);
    expect(listApplications()).toEqual([]);

    const parsed = parseBackup(text);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.invalidCount).toBe(0);
    const summary = restoreBackup(parsed.backup, "merge");
    expect(summary).toEqual({
      history: { imported: 1, skipped: 0 },
      applications: { imported: 1, skipped: 0 },
      learning: { imported: 0 },
    });
    expect(listHistoryEntries()[0].jobTitle).toBe("Job 1");
    expect(listApplications()[0].role).toBe("Frontend Developer");
  });

  it("merge skips entries that already exist, replace swaps the data", () => {
    saveApplication(applicationInput("Frontend Developer"));
    const backup = createBackup();
    saveApplication(applicationInput("Backend Developer Intern"));

    const merged = restoreBackup(backup, "merge");
    expect(merged?.applications).toEqual({ imported: 0, skipped: 1 });
    expect(listApplications()).toHaveLength(2);

    const replaced = restoreBackup(backup, "replace");
    expect(replaced?.applications).toEqual({ imported: 1, skipped: 0 });
    expect(listApplications().map((application) => application.role)).toEqual([
      "Frontend Developer",
    ]);
  });

  it("keeps only the newest 10 analyses when merging", () => {
    vi.useFakeTimers();
    for (let index = 0; index < 8; index += 1) {
      vi.setSystemTime(new Date(2026, 0, 1, index));
      saveHistoryEntry(historyInput(index));
    }
    const backup = createBackup();
    deleteAllData();
    for (let index = 8; index < 12; index += 1) {
      vi.setSystemTime(new Date(2026, 0, 1, index));
      saveHistoryEntry(historyInput(index));
    }

    const summary = restoreBackup(backup, "merge");
    expect(listHistoryEntries()).toHaveLength(10);
    expect(summary?.history).toEqual({ imported: 6, skipped: 2 });
    expect(listHistoryEntries().map((entry) => entry.jobTitle)).not.toContain("Job 0");
  });

  it("drops invalid entries and reports how many", () => {
    saveApplication(applicationInput("Frontend Developer"));
    const backup = createBackup();
    const tampered = {
      ...backup,
      applications: [
        ...backup.applications,
        { ...backup.applications[0], id: "bad", jobUrl: "javascript:alert(1)" },
        { nonsense: true },
      ],
      history: [{ id: "broken" }],
    };
    const parsed = parseBackup(JSON.stringify(tampered));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.invalidCount).toBe(3);
    expect(parsed.backup.applications).toHaveLength(1);
  });

  it("rejects files that are not ResuFit backups", () => {
    expect(parseBackup("not json")).toEqual({
      success: false,
      error: "This file isn't valid JSON. Choose a ResuFit backup file.",
    });
    expect(parseBackup(JSON.stringify({ app: "other" }))).toMatchObject({
      success: false,
      error: "This file isn't a ResuFit backup.",
    });
    expect(
      parseBackup(
        JSON.stringify({ app: "resufit", version: 99, exportedAt: "", history: [], applications: [] }),
      ),
    ).toMatchObject({ success: false, error: expect.stringMatching(/different version/) });
    expect(parseBackup("x".repeat(5 * 1024 * 1024 + 1))).toMatchObject({
      success: false,
      error: expect.stringMatching(/5 MB/),
    });
  });

  it("backs up and restores learning progress", () => {
    setSkillStatus("typescript", "done");
    const text = JSON.stringify(createBackup());
    deleteAllData();
    expect(readLearningProgress()).toEqual({});

    const parsed = parseBackup(text);
    if (!parsed.success) throw new Error(parsed.error);
    expect(restoreBackup(parsed.backup, "merge")?.learning).toEqual({ imported: 1 });
    expect(readLearningProgress().typescript.status).toBe("done");
  });

  it("restores backups made before learning progress existed", () => {
    saveApplication(applicationInput("Frontend Developer"));
    const { learning: _learning, ...older } = createBackup();
    void _learning;
    deleteAllData();
    const parsed = parseBackup(JSON.stringify(older));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.backup.learning).toEqual({});
    expect(restoreBackup(parsed.backup, "merge")?.applications.imported).toBe(1);
  });

  it("deletes all data including the compare prefill", () => {
    saveHistoryEntry(historyInput(1));
    saveApplication(applicationInput("Frontend Developer"));
    session.setItem("resufit:compare-prefill", "{}");
    setSkillStatus("docker", "learning");
    deleteAllData();
    expect(local.store.size).toBe(0);
    expect(session.store.size).toBe(0);
  });

  it("names backup files by local date", () => {
    expect(backupFileName(new Date(2026, 9, 5, 23))).toBe("resufit-backup-2026-10-05.json");
  });
});
