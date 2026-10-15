import { describe, expect, it } from "vitest";
import { matchSkills, normalizeSkill } from "@/lib/matching/skills";

describe("normalizeSkill", () => {
  it.each([
    ["React.js", "react"],
    ["Node", "node.js"],
    ["REST APIs", "rest api"],
    ["REST API design", "rest api"],
    ["js", "javascript"],
    ["Gemini API", "gemini"],
    ["Google Gemini API", "gemini"],
    ["Google Gemini", "gemini"],
    ["OpenAI API", "openai"],
    ["websocket", "websockets"],
    ["web sockets", "websockets"],
    ["JavaScript fundamentals", "javascript"],
    ["strong experience with JavaScript basics", "javascript"],
    ["GitHub Actions", "github actions"],
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

  it("matches normalized skill phrases in resume text and related concepts", () => {
    expect(
      matchSkills([], ["Gemini", "LLM APIs"], "Built an app using Gemini API"),
    ).toEqual({ matched: ["Gemini", "LLM APIs"], missing: [] });
    expect(
      matchSkills([], ["authentication"], "Implemented JWT authentication"),
    ).toEqual({ matched: ["authentication"], missing: [] });
    expect(
      matchSkills(["JavaScript fundamentals"], ["JavaScript"]),
    ).toEqual({ matched: ["JavaScript"], missing: [] });
  });

  it("matches real-time concepts from websockets and preserves separate products", () => {
    expect(matchSkills(["Web sockets"], ["real-time features"])).toEqual({
      matched: ["real-time features"],
      missing: [],
    });
    expect(matchSkills(["GitHub Actions"], ["GitHub"])).toEqual({
      matched: [],
      missing: ["GitHub"],
    });
    expect(matchSkills(["Mongoose"], ["MongoDB"])).toEqual({
      matched: [],
      missing: ["MongoDB"],
    });
  });
});
