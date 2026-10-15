import { describe, expect, it } from "vitest";
import { buildMarkdownReport } from "@/lib/report";
import { makeJob, makeResume } from "@/tests/fixtures";
import type { MatchResult } from "@/lib/schemas";

describe("buildMarkdownReport", () => {
  it("includes the score, label, and every suggestion title", () => {
    const match: MatchResult = {
      score: 82,
      label: "Strong match",
      matchedMustHave: ["React"],
      missingMustHave: ["PostgreSQL"],
      matchedNiceToHave: ["Git"],
      missingNiceToHave: [],
      suggestions: [
        { title: "Highlight React", detail: "Mention React in your summary." },
        { title: "Learn PostgreSQL", detail: "Build a small project." },
      ],
    };

    const report = buildMarkdownReport({
      fileName: "resume.pdf",
      resume: makeResume(),
      job: makeJob({ jobTitle: "Frontend Engineer" }),
      match,
    });

    expect(report).toContain("82/100");
    expect(report).toContain("Strong match");
    expect(report).toContain("Highlight React");
    expect(report).toContain("Learn PostgreSQL");
  });
});
