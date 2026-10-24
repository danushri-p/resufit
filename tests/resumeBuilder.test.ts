import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bulletText,
  countImprovedBullets,
  createDraft,
  displayedSkills,
  draftToPlainText,
  loadResumeDraft,
  moveItem,
  orderSkillsForJob,
  resumeFileName,
  saveResumeDraft,
  startResumeBuilder,
  type ResumeBuilderInput,
} from "@/lib/resumeBuilder";
import { makeResume } from "@/tests/fixtures";

function input(overrides: Partial<ResumeBuilderInput> = {}): ResumeBuilderInput {
  return {
    resume: makeResume({
      name: "Alex Kumar",
      email: "alex.kumar@example.com",
      summary: "Computer science student.",
      skills: ["Python", "React.js", "Node.js", "Git"],
      experience: [
        {
          role: "Intern",
          company: "Acme",
          startDate: "Jun 2025",
          endDate: "Aug 2025",
          bullets: ["Fixed bugs in the dashboard"],
        },
      ],
      projects: [
        {
          name: "CampusConnect",
          description: "Event planner",
          techStack: ["React", "Node.js"],
          bullets: ["Built event pages", "Developed 12 REST endpoints"],
        },
        {
          name: "StudySpace",
          description: "Room finder",
          techStack: ["Next.js"],
          bullets: ["Implemented room search"],
        },
      ],
      education: [{ degree: "B.Sc. Computer Science", institution: "Example State University", year: "2027" }],
      certifications: [],
    }),
    rewrites: [
      {
        projectName: "CampusConnect",
        rewrites: [
          { original: "Built event pages", rewritten: "Built responsive React event pages", reason: "Uses job wording" },
          { original: "Developed 12 REST endpoints", rewritten: "Developed 12 REST endpoints", reason: "Kept as is" },
        ],
      },
    ],
    matchedSkills: ["React", "Node.js"],
    rejectedBullets: [],
    jobTitle: "Frontend Developer",
    company: "BrightPath Studio",
    ...overrides,
  };
}

describe("resume builder draft", () => {
  it("uses approved improvements by default and ignores unchanged rewrites", () => {
    const draft = createDraft(input());
    const [built, endpoints] = draft.projects[0].bullets;
    expect(built.improved).toBe("Built responsive React event pages");
    expect(built.useImproved).toBe(true);
    expect(bulletText(built)).toBe("Built responsive React event pages");
    expect(endpoints.improved).toBeNull();
    expect(bulletText(endpoints)).toBe("Developed 12 REST endpoints");
    expect(countImprovedBullets(draft)).toEqual({ available: 1, used: 1 });
  });

  it("starts rejected rewrites on the original wording but keeps them available", () => {
    const draft = createDraft(input({ rejectedBullets: ["Built event pages"] }));
    const [built] = draft.projects[0].bullets;
    expect(built.improved).toBe("Built responsive React event pages");
    expect(built.useImproved).toBe(false);
    expect(bulletText(built)).toBe("Built event pages");
    expect(countImprovedBullets(draft)).toEqual({ available: 1, used: 0 });
  });

  it("switches back to the original wording and respects user edits", () => {
    const draft = createDraft(input());
    const bullet = draft.projects[0].bullets[0];
    expect(bulletText({ ...bullet, useImproved: false })).toBe("Built event pages");
    expect(bulletText({ ...bullet, edited: "Built event pages for 3 clubs" })).toBe(
      "Built event pages for 3 clubs",
    );
  });

  it("only contains text from the resume or an approved rewrite", () => {
    const source = input();
    const draft = createDraft(source);
    const allowed = new Set([
      ...source.resume.projects.flatMap((project) => project.bullets),
      ...source.resume.experience.flatMap((entry) => entry.bullets),
      ...source.rewrites.flatMap((entry) => entry.rewrites.map((rewrite) => rewrite.rewritten)),
    ]);
    for (const bullet of [
      ...draft.projects.flatMap((project) => project.bullets),
      ...draft.experience.flatMap((entry) => entry.bullets),
    ]) {
      expect(allowed.has(bulletText(bullet))).toBe(true);
    }
    expect(draft.skills).toEqual(source.resume.skills);
  });

  it("puts matching skills first without adding new ones", () => {
    expect(orderSkillsForJob(["Python", "React.js", "Node.js", "Git"], ["React", "Node.js", "TypeScript"])).toEqual([
      "React.js",
      "Node.js",
      "Python",
      "Git",
    ]);
    const draft = createDraft(input());
    expect(displayedSkills({ ...draft, matchingSkillsFirst: false })).toEqual(draft.skills);
  });

  it("moves items within bounds", () => {
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });
});

describe("plain-text resume", () => {
  it("writes standard headings in order and skips empty sections", () => {
    const draft = createDraft(input());
    const text = draftToPlainText({ ...draft, projects: moveItem(draft.projects, 1, -1) });
    expect(text.startsWith("Alex Kumar\nalex.kumar@example.com\n")).toBe(true);
    expect(text).toContain("SKILLS\nReact.js, Node.js, Python, Git");
    expect(text.indexOf("StudySpace")).toBeLessThan(text.indexOf("CampusConnect"));
    expect(text).toContain("- Built responsive React event pages");
    expect(text).toContain("EXPERIENCE\nIntern, Acme (Jun 2025 – Aug 2025)\n- Fixed bugs in the dashboard");
    expect(text).toContain("EDUCATION\nB.Sc. Computer Science, Example State University, 2027");
    expect(text).not.toContain("CERTIFICATIONS");
  });

  it("names the file after the person and job", () => {
    expect(resumeFileName(createDraft(input()))).toBe("alex-kumar-frontend-developer-resufit.txt");
  });
});

describe("builder session storage", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts from the input, keeps edits, and resets on a new start", () => {
    expect(loadResumeDraft()).toBeUndefined();
    startResumeBuilder(input());
    const draft = loadResumeDraft()!;
    expect(draft.name).toBe("Alex Kumar");

    saveResumeDraft({ ...draft, summary: "Edited summary" });
    expect(loadResumeDraft()?.summary).toBe("Edited summary");

    startResumeBuilder(input());
    expect(loadResumeDraft()?.summary).toBe("Computer science student.");
  });

  it("ignores invalid stored data", () => {
    store.set("resufit:resume-builder", "{\"resume\": 1}");
    expect(loadResumeDraft()).toBeUndefined();
  });
});
