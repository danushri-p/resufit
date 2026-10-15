import { describe, expect, it } from "vitest";
import { matchSkills, normalizeSkill } from "@/lib/matching/skills";

describe("normalizeSkill", () => {
  it.each([
    ["React.js", "react"],
    ["Node", "node.js"],
    ["REST APIs", "rest api"],
    ["REST API design", "rest api"],
    ["js", "javascript"],
  ])("normalizes %s", (skill, expected) => {
    expect(normalizeSkill(skill)).toBe(expected);
  });
});

describe("matchSkills", () => {
  it("returns matched and missing requirements", () => {
    expect(matchSkills(["React.js", "TypeScript"], ["React", "PostgreSQL"])).toEqual({
      matched: ["React"],
      missing: ["PostgreSQL"],
    });
  });
});
