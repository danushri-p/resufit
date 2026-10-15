import { describe, expect, it } from "vitest";
import { runAtsChecks } from "@/lib/ats";
import { sampleJobDescription, sampleResumeText } from "@/lib/samples";
import { makeJob, makeResume } from "@/tests/fixtures";

describe("sample data", () => {
  it("includes a resume and job description with only example.com email domains", () => {
    expect(sampleResumeText.trim()).not.toBe("");
    expect(sampleJobDescription.trim()).not.toBe("");

    const emails = `${sampleResumeText}\n${sampleJobDescription}`.match(
      /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,
    ) ?? [];
    expect(emails.length).toBeGreaterThan(0);
    expect(emails.every((email) => email.toLowerCase().endsWith("@example.com"))).toBe(
      true,
    );
    expect(sampleResumeText.trim().split(/\s+/).length).toBeGreaterThanOrEqual(320);
    expect(sampleResumeText.trim().split(/\s+/).length).toBeLessThanOrEqual(380);
    expect(sampleJobDescription.trim().split(/\s+/).length).toBeGreaterThanOrEqual(130);
    expect(sampleJobDescription.trim().split(/\s+/).length).toBeLessThanOrEqual(180);
    expect((sampleResumeText.match(/^- /gm) ?? []).length).toBe(6);
  });

  it("passes the contact, section, length, action-verb and metrics ATS checks", () => {
    const ats = runAtsChecks({
      resumeText: sampleResumeText,
      resume: makeResume({
        projects: [
          {
            name: "Sample projects",
            description: null,
            techStack: [],
            bullets: (sampleResumeText.match(/^- .+$/gm) ?? []).map((bullet) =>
              bullet.replace(/^- /, ""),
            ),
          },
        ],
      }),
      job: makeJob(),
    });
    for (const id of ["contact", "sections", "length", "actionVerbs", "metrics"]) {
      const check = ats.checks.find((item) => item.id === id);
      expect(check?.status, check?.detail).toBe("pass");
    }
  });
});
