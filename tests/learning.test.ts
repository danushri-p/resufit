import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import compareFixture from "@/e2e/fixtures/compare.json";
import {
  buildLearningPlan,
  getSkillStatus,
  importLearningProgress,
  readLearningProgress,
  setSkillStatus,
} from "@/lib/learning";
import { curatedResourceUrls, findLearningResource, practiceIdea } from "@/lib/learningResources";
import type { HistoryEntry } from "@/lib/history";
import { CompareResultSchema } from "@/lib/schemas";
import { emptyAts, makeJob, makeResume } from "@/tests/fixtures";

function analysisEntry(missingMustHave: string[], missingNiceToHave: string[], projects = true): HistoryEntry {
  return {
    id: "a1",
    createdAt: "2026-10-01T00:00:00.000Z",
    fileName: "resume.pdf",
    jobTitle: "Frontend Developer",
    company: "BrightPath Studio",
    matchScore: 70,
    atsScore: 80,
    result: {
      resume: makeResume({
        projects: projects
          ? [{ name: "CampusConnect", description: null, techStack: ["React"], bullets: [] }]
          : [],
      }),
      job: makeJob(),
      match: {
        score: 70,
        label: "Good match",
        matchedMustHave: [],
        missingMustHave,
        matchedNiceToHave: [],
        missingNiceToHave,
        suggestions: [],
        ats: emptyAts,
      },
      ats: emptyAts,
    },
  };
}

describe("learning plan", () => {
  it("lists must-haves before nice-to-haves with official docs and a practice idea", () => {
    const plan = buildLearningPlan(analysisEntry(["TypeScript", "Docker"], ["AWS"]));
    expect(plan.map((item) => [item.skill, item.priority])).toEqual([
      ["TypeScript", "must"],
      ["Docker", "must"],
      ["AWS", "nice"],
    ]);
    expect(plan[0]).toMatchObject({
      key: "typescript",
      reason: "Required by Frontend Developer",
      resource: { url: "https://www.typescriptlang.org/docs/", official: true },
      practice: "Convert one part of CampusConnect to TypeScript and fix the type errors it finds.",
    });
    expect(plan[1].practice).toBe("Write a Dockerfile that runs CampusConnect locally with one command.");
  });

  it("dedupes skills that normalize to the same key", () => {
    const plan = buildLearningPlan(analysisEntry(["React.js"], ["React", "react"]));
    expect(plan).toHaveLength(1);
    expect(plan[0].resource.url).toBe("https://react.dev/learn");
  });

  it("uses a generic practice target when the resume has no projects", () => {
    const plan = buildLearningPlan(analysisEntry(["PostgreSQL"], [], false));
    expect(plan[0].practice).toContain("a small practice project");
  });

  it("builds a plan from a comparison's shared skill gaps", () => {
    const comparison = CompareResultSchema.parse(compareFixture);
    const entry: HistoryEntry = {
      id: "c1",
      createdAt: "2026-10-01T00:00:00.000Z",
      type: "comparison",
      fileName: "resume.pdf",
      jobTitle: "Comparison (2 jobs)",
      company: "",
      matchScore: 80,
      atsScore: 80,
      comparison,
    };
    const plan = buildLearningPlan(entry);
    expect(plan.length).toBe(comparison.skillGaps.length);
    expect(plan.every((item) => item.priority === "must")).toBe(true);
    expect(plan[0].reason).toMatch(/^Required by \d of \d jobs?: /);
  });
});

describe("learning resources", () => {
  it("resolves aliases to the same official docs", () => {
    expect(findLearningResource("Postgres").url).toBe(findLearningResource("PostgreSQL").url);
    expect(findLearningResource("CI/CD").url).toBe("https://docs.github.com/en/actions");
    expect(findLearningResource("LLM APIs").url).toBe("https://ai.google.dev/gemini-api/docs");
  });

  it("falls back to a clearly labelled search for unknown skills", () => {
    const resource = findLearningResource("Elm");
    expect(resource.official).toBe(false);
    expect(resource.title).toBe("Search for the official Elm documentation");
    expect(resource.url).toBe("https://duckduckgo.com/?q=Elm%20official%20documentation");
  });

  it("only links to https pages", () => {
    for (const url of curatedResourceUrls()) {
      expect(new URL(url).protocol).toBe("https:");
    }
  });

  it("writes readable practice ideas", () => {
    expect(practiceIdea("Unit testing", "testing", "StudySpace")).toBe(
      "Write unit tests for the most important feature of StudySpace.",
    );
    expect(practiceIdea("Elm", null, "StudySpace")).toBe("Build a small feature in StudySpace that uses Elm.");
  });
});

describe("learning progress", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("saves statuses and removes not-started entries", () => {
    setSkillStatus("typescript", "learning");
    expect(getSkillStatus(readLearningProgress(), "typescript")).toBe("learning");
    setSkillStatus("typescript", "done");
    expect(getSkillStatus(readLearningProgress(), "typescript")).toBe("done");
    setSkillStatus("typescript", "not-started");
    expect(store.size).toBe(0);
  });

  it("ignores corrupted progress", () => {
    store.set("resufit:learning", "{\"typescript\": {\"status\": \"mastered\"}}");
    expect(readLearningProgress()).toEqual({});
  });

  it("merges without overwriting existing progress", () => {
    setSkillStatus("docker", "done");
    const result = importLearningProgress(
      {
        docker: { status: "learning", updatedAt: "2026-01-01T00:00:00.000Z" },
        aws: { status: "learning", updatedAt: "2026-01-01T00:00:00.000Z" },
      },
      "merge",
    );
    expect(result).toEqual({ imported: 1 });
    expect(readLearningProgress().docker.status).toBe("done");
    expect(readLearningProgress().aws.status).toBe("learning");
  });
});
