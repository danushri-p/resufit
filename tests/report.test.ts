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
      ats: {
        score: 75,
        checks: [{
          id: "length",
          label: "Resume length",
          status: "pass",
          detail: "Your resume has a suitable length.",
        }],
      },
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

  it("includes a cover letter section when a letter exists", () => {
    const match: MatchResult = {
      score: 82,
      label: "Strong match",
      matchedMustHave: [],
      missingMustHave: [],
      matchedNiceToHave: [],
      missingNiceToHave: [],
      suggestions: [],
      ats: { score: 75, checks: [] },
    };
    const report = buildMarkdownReport({
      fileName: "resume.pdf",
      resume: makeResume(),
      job: makeJob(),
      match,
      coverLetter: "Dear Hiring Team,\n\nMy edited cover letter.",
    });

    expect(report).toContain("## Cover letter");
    expect(report).toContain("My edited cover letter.");
  });

  it("includes an interview prep section when questions exist", () => {
    const match: MatchResult = {
      score: 82,
      label: "Strong match",
      matchedMustHave: [],
      missingMustHave: [],
      matchedNiceToHave: [],
      missingNiceToHave: [],
      suggestions: [],
      ats: { score: 75, checks: [] },
    };
    const report = buildMarkdownReport({
      fileName: "resume.pdf",
      resume: makeResume(),
      job: makeJob(),
      match,
      interviewPrep: {
        questions: [{
          category: "technical",
          question: "How did you use React?",
          whyAsked: "The interviewer wants to understand your experience.",
          answerOutline: ["Discuss the project.", "Explain what you contributed."],
          basedOn: "Planner",
        }],
        warnings: [],
      },
    });

    expect(report).toContain("## Interview prep");
    expect(report).toContain("How did you use React?");
    expect(report).toContain("**Based on:** Planner");
  });
});
