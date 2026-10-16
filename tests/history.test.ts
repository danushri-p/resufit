import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearHistory,
  deleteHistoryEntry,
  getHistoryEntry,
  listHistoryEntries,
  saveHistoryEntry,
} from "@/lib/history";
import { emptyAts, makeJob, makeResume } from "@/tests/fixtures";
import type { HistoryEntryInput } from "@/lib/history";

const storage = new Map<string, string>();
let shouldThrow = false;

const localStorageMock = {
  getItem: (key: string) => {
    if (shouldThrow) throw new Error("blocked");
    return storage.get(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    if (shouldThrow) throw new Error("blocked");
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    if (shouldThrow) throw new Error("blocked");
    storage.delete(key);
  },
};

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
    result: {
      resume: makeResume(),
      job: makeJob(),
      match,
      ats: emptyAts,
    },
  };
}

describe("history", () => {
  beforeEach(() => {
    storage.clear();
    shouldThrow = false;
    vi.stubGlobal("localStorage", localStorageMock);
  });

  it("saves newest first and caps the list at ten entries", () => {
    for (let index = 0; index < 12; index += 1) {
      saveHistoryEntry(historyInput(index));
    }
    const entries = listHistoryEntries();
    expect(entries).toHaveLength(10);
    expect(entries[0].fileName).toBe("resume-11.pdf");
    expect(entries.at(-1)?.fileName).toBe("resume-2.pdf");
  });

  it("deletes one entry and clears all entries", () => {
    const id = saveHistoryEntry(historyInput(1));
    expect(getHistoryEntry(id!)?.fileName).toBe("resume-1.pdf");
    saveHistoryEntry(historyInput(2));
    deleteHistoryEntry(id!);
    expect(listHistoryEntries()).toHaveLength(1);
    clearHistory();
    expect(listHistoryEntries()).toEqual([]);
  });

  it("ignores invalid stored JSON and invalid entries", () => {
    storage.set("resufit:history", "{");
    expect(listHistoryEntries()).toEqual([]);
    storage.set("resufit:history", JSON.stringify([{ id: "bad" }]));
    expect(listHistoryEntries()).toEqual([]);
  });

  it("does not throw when localStorage is blocked", () => {
    shouldThrow = true;
    expect(() => saveHistoryEntry(historyInput(1))).not.toThrow();
    expect(() => listHistoryEntries()).not.toThrow();
    expect(() => deleteHistoryEntry("id")).not.toThrow();
    expect(() => clearHistory()).not.toThrow();
  });

  it("saves and reads a comparison entry without changing analysis entries", () => {
    const comparisonId = saveHistoryEntry({
      type: "comparison",
      fileName: "resume.pdf",
      jobTitle: "Comparison (2 jobs)",
      company: "",
      matchScore: 80,
      atsScore: 75,
      comparison: {
        resume: makeResume(),
        jobs: [
          {
            index: 0,
            job: makeJob({ jobTitle: "Frontend Engineer" }),
            match: {
              score: 80,
              label: "Strong match",
              matchedMustHave: [],
              missingMustHave: [],
              matchedNiceToHave: [],
              missingNiceToHave: [],
              suggestions: [],
              ats: emptyAts,
            },
            atsKeywordCoverage: 80,
          },
          {
            index: 1,
            job: makeJob({ jobTitle: "Backend Engineer" }),
            match: {
              score: 60,
              label: "Good match",
              matchedMustHave: [],
              missingMustHave: [],
              matchedNiceToHave: [],
              missingNiceToHave: [],
              suggestions: [],
              ats: emptyAts,
            },
            atsKeywordCoverage: 60,
          },
        ],
        skillGaps: [],
      },
    });
    const oldEntryId = saveHistoryEntry(historyInput(8));
    const entries = listHistoryEntries();

    expect(getHistoryEntry(comparisonId!)).toMatchObject({
      type: "comparison",
    });
    expect(entries.some((entry) => entry.id === oldEntryId && !("type" in entry)))
      .toBe(true);
    expect(entries).toHaveLength(2);
  });
});
