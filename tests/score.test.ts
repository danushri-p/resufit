import { describe, expect, it } from "vitest";
import { getMatchLabel, computeMatchScore } from "@/lib/matching/score";
import { matchSkills } from "@/lib/matching/skills";
import { makeJob, makeResume } from "@/tests/fixtures";

describe("computeMatchScore", () => {
  it("applies 70% must-have coverage", () => {
    const resume = makeResume({ skills: ["React"] });
    const job = makeJob({
      mustHaveSkills: ["React"],
      niceToHaveSkills: ["Git"],
      yearsOfExperience: 1,
    });

    expect(
      computeMatchScore(
        resume,
        job,
        matchSkills(resume.skills, job.mustHaveSkills),
        matchSkills(resume.skills, job.niceToHaveSkills),
      ),
    ).toBe(70);
  });

  it("applies 20% nice-to-have coverage", () => {
    const resume = makeResume({ skills: ["Git"] });
    const job = makeJob({
      mustHaveSkills: ["React"],
      niceToHaveSkills: ["Git"],
      yearsOfExperience: 1,
    });

    expect(
      computeMatchScore(
        resume,
        job,
        matchSkills(resume.skills, job.mustHaveSkills),
        matchSkills(resume.skills, job.niceToHaveSkills),
      ),
    ).toBe(20);
  });

  it("gives full skill coverage for empty lists and 10% for experience", () => {
    const job = makeJob({ yearsOfExperience: 1 });
    const noExperience = makeResume();
    const withExperience = makeResume({
      experience: [
        {
          role: "Developer",
          company: "Example Co",
          startDate: null,
          endDate: null,
          bullets: [],
        },
      ],
    });
    const emptyMatches = { matched: [], missing: [] };

    expect(
      computeMatchScore(noExperience, job, emptyMatches, emptyMatches),
    ).toBe(90);
    expect(
      computeMatchScore(withExperience, job, emptyMatches, emptyMatches),
    ).toBe(100);
  });

  it("gives full experience points when no years are required", () => {
    const resume = makeResume();
    const job = makeJob();
    const emptyMatches = { matched: [], missing: [] };

    expect(
      computeMatchScore(resume, job, emptyMatches, emptyMatches),
    ).toBe(100);
  });
});

describe("getMatchLabel", () => {
  it.each([
    [80, "Strong match"],
    [60, "Good match"],
    [40, "Partial match"],
    [39, "Weak match"],
  ] as const)("labels %i", (score, label) => {
    expect(getMatchLabel(score)).toBe(label);
  });
});
