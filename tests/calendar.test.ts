import { describe, expect, it } from "vitest";
import { buildFollowUpIcs, escapeIcsText, followUpFileName } from "@/lib/calendar";
import type { Application } from "@/lib/tracker";

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: "app-1",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    role: "Frontend Developer",
    company: "BrightPath Studio",
    status: "applied",
    appliedOn: "2026-10-01",
    followUpOn: "2026-10-31",
    jobUrl: "https://example.com/jobs/1",
    notes: "",
    matchScore: 82,
    historyId: null,
    ...overrides,
  };
}

describe("follow-up calendar file", () => {
  const now = new Date(Date.UTC(2026, 9, 22, 8, 30, 5));

  it("creates an all-day event on the follow-up date", () => {
    const ics = buildFollowUpIcs(application(), now)!;
    const lines = ics.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("DTSTART;VALUE=DATE:20261031");
    expect(lines).toContain("DTEND;VALUE=DATE:20261101");
    expect(lines).toContain("DTSTAMP:20261022T083005Z");
    expect(lines).toContain("UID:app-1-follow-up@resufit");
    expect(lines).toContain("SUMMARY:Follow up: Frontend Developer at BrightPath Studio");
    expect(ics).toContain("ResuFit match: 82/100");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("returns nothing without a follow-up date", () => {
    expect(buildFollowUpIcs(application({ followUpOn: null }), now)).toBeUndefined();
  });

  it("escapes special characters", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const ics = buildFollowUpIcs(application({ company: "Acme, Inc.; Labs" }), now)!;
    expect(ics).toContain("SUMMARY:Follow up: Frontend Developer at Acme\\, Inc.\\; Labs");
  });

  it("folds long lines to 75 octets", () => {
    const ics = buildFollowUpIcs(application({ notes: "Long note ".repeat(40) }), now)!;
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(ics).toContain("\r\n ");
  });

  it("names the file after the role and company", () => {
    expect(followUpFileName(application({ company: "Acme, Inc." }))).toBe(
      "resufit-follow-up-frontend-developer-acme-inc.ics",
    );
  });
});
