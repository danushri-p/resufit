import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearApplications,
  deleteApplication,
  exportApplicationsCsv,
  findApplicationByHistoryId,
  findTrackedApplication,
  getApplication,
  getTrackerStats,
  isFollowUpDue,
  listApplications,
  saveApplication,
  todayIsoDate,
  updateApplication,
  validateApplicationInput,
  type Application,
  type ApplicationInput,
} from "@/lib/tracker";

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

function input(overrides: Partial<ApplicationInput> = {}): ApplicationInput {
  return {
    role: "Frontend Developer",
    company: "Northstar Learning Lab",
    status: "saved",
    appliedOn: null,
    followUpOn: null,
    jobUrl: null,
    notes: "",
    matchScore: null,
    historyId: null,
    ...overrides,
  };
}

function application(overrides: Partial<Application> = {}): Application {
  return {
    ...input(),
    id: "id",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("tracker storage", () => {
  beforeEach(() => {
    storage.clear();
    shouldThrow = false;
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("creates, lists, updates, deletes and clears applications", () => {
    const saved = saveApplication(input({ matchScore: 82 }));
    expect(saved?.id).toBeTruthy();
    expect(listApplications()).toHaveLength(1);
    expect(getApplication(saved!.id)?.matchScore).toBe(82);

    const updated = updateApplication(saved!.id, { notes: "Referral from Priya" });
    expect(updated?.notes).toBe("Referral from Priya");
    expect(updated!.updatedAt >= saved!.updatedAt).toBe(true);

    deleteApplication(saved!.id);
    expect(listApplications()).toEqual([]);

    saveApplication(input());
    clearApplications();
    expect(listApplications()).toEqual([]);
  });

  it("keeps at most 100 applications, newest first", () => {
    for (let index = 0; index < 105; index += 1) {
      saveApplication(input({ role: `Role ${index}` }));
    }
    const stored = JSON.parse(storage.get("resufit:applications")!) as unknown[];
    expect(stored).toHaveLength(100);
    expect((stored[0] as Application).role).toBe("Role 104");
  });

  it("ignores bad JSON and invalid entries", () => {
    storage.set("resufit:applications", "not json");
    expect(listApplications()).toEqual([]);

    storage.set(
      "resufit:applications",
      JSON.stringify([application(), { role: "missing fields" }]),
    );
    expect(listApplications()).toHaveLength(1);
  });

  it("does not crash when storage throws", () => {
    shouldThrow = true;
    expect(listApplications()).toEqual([]);
    expect(saveApplication(input())).toBeUndefined();
    expect(() => deleteApplication("x")).not.toThrow();
    expect(() => clearApplications()).not.toThrow();
  });

  it("fills today's date when status becomes applied without a date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    const saved = saveApplication(input());
    expect(saved?.appliedOn).toBeNull();

    const applied = updateApplication(saved!.id, { status: "applied" });
    expect(applied?.appliedOn).toBe("2026-10-21");

    const existingDate = saveApplication(
      input({ status: "applied", appliedOn: "2026-10-01" }),
    );
    expect(existingDate?.appliedOn).toBe("2026-10-01");
  });

  it("finds an application by its history id", () => {
    saveApplication(input({ historyId: "history-1" }));
    expect(findApplicationByHistoryId("history-1")?.role).toBe("Frontend Developer");
    expect(findApplicationByHistoryId("history-2")).toBeUndefined();
  });

  it("treats each job in a shared comparison entry as a separate application", () => {
    saveApplication(input({ historyId: "comparison-1", role: "Frontend Developer" }));
    expect(
      findTrackedApplication({
        historyId: "comparison-1",
        role: " frontend developer ",
        company: "NORTHSTAR LEARNING LAB",
      }),
    ).toBeDefined();
    expect(
      findTrackedApplication({
        historyId: "comparison-1",
        role: "Backend Developer Intern",
        company: "Northstar Learning Lab",
      }),
    ).toBeUndefined();
  });

  it("lists due follow-ups first, then most recently updated", () => {
    storage.set(
      "resufit:applications",
      JSON.stringify([
        application({ id: "old", updatedAt: "2026-10-01T00:00:00.000Z" }),
        application({ id: "new", updatedAt: "2026-10-10T00:00:00.000Z" }),
        application({ id: "due", followUpOn: "2000-01-01", updatedAt: "2026-09-01T00:00:00.000Z" }),
      ]),
    );
    expect(listApplications().map((entry) => entry.id)).toEqual(["due", "new", "old"]);
  });
});

describe("tracker validation", () => {
  it("requires role and company and validates dates", () => {
    const result = validateApplicationInput(
      input({ role: " ", company: "", appliedOn: "2026-02-30" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.role).toBe("Enter the role.");
      expect(result.errors.company).toBe("Enter the company.");
      expect(result.errors.appliedOn).toBe("Enter a valid date.");
    }
  });

  it("accepts http(s) links and rejects javascript: links", () => {
    expect(validateApplicationInput(input({ jobUrl: "https://example.com/jobs/1" })).success).toBe(true);
    const unsafe = validateApplicationInput(input({ jobUrl: "javascript:alert(1)" }));
    expect(unsafe.success).toBe(false);
    if (!unsafe.success) {
      expect(unsafe.errors.jobUrl).toMatch(/http/);
    }
  });
});

describe("tracker stats", () => {
  const today = "2026-10-21";

  it("counts statuses and response rate", () => {
    const stats = getTrackerStats(
      [
        application({ status: "saved" }),
        application({ status: "applied" }),
        application({ status: "applied" }),
        application({ status: "interviewing" }),
        application({ status: "rejected" }),
      ],
      today,
    );
    expect(stats.total).toBe(5);
    expect(stats.byStatus).toEqual({
      saved: 1,
      applied: 2,
      interviewing: 1,
      offer: 0,
      rejected: 1,
    });
    expect(stats.responseRate).toBe(50);
  });

  it("returns a null response rate when nothing has been applied to", () => {
    expect(getTrackerStats([application({ status: "saved" })], today).responseRate).toBeNull();
    expect(getTrackerStats([], today).responseRate).toBeNull();
  });

  it("counts follow-ups due, ignoring future dates and closed applications", () => {
    const stats = getTrackerStats(
      [
        application({ status: "applied", followUpOn: "2026-10-20" }),
        application({ status: "interviewing", followUpOn: today }),
        application({ status: "applied", followUpOn: "2026-10-30" }),
        application({ status: "offer", followUpOn: "2026-10-01" }),
        application({ status: "rejected", followUpOn: "2026-10-01" }),
      ],
      today,
    );
    expect(stats.followUpsDue).toBe(2);
    expect(isFollowUpDue(application({ followUpOn: null }), today)).toBe(false);
  });

  it("formats today as a local YYYY-MM-DD date", () => {
    expect(todayIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("tracker CSV export", () => {
  it("writes a header row and escapes quotes, commas and newlines", () => {
    const csv = exportApplicationsCsv([
      application({
        role: 'Developer, "Platform"',
        notes: "Line one\nLine two",
        matchScore: 82,
      }),
    ]);
    const [header, ...rest] = csv.split("\r\n");
    expect(header).toBe(
      "Role,Company,Status,Applied on,Follow up on,Match score,Job link,Notes,Updated",
    );
    const row = rest.join("\r\n");
    expect(row).toContain('"Developer, ""Platform"""');
    expect(row).toContain('"Line one\nLine two"');
    expect(row).toContain(",82,");
  });

  it("neutralizes spreadsheet formulas", () => {
    const csv = exportApplicationsCsv([
      application({ role: "=HYPERLINK(\"x\")", company: "+Acme", notes: "@cmd" }),
    ]);
    const row = csv.split("\r\n")[1];
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain("'+Acme");
    expect(row).toContain("'@cmd");
  });
});
