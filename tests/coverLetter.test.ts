import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIRequestError } from "@/lib/ai/errors";
import { generateCoverLetter } from "@/lib/ai/coverLetter";
import { makeJob, makeResume } from "@/tests/fixtures";
import type { CoverLetter, MatchResult } from "@/lib/schemas";

vi.mock("server-only", () => ({}));

let modelNumber = 0;

function response(letter: CoverLetter): Response {
  return Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(letter) }] } }],
  });
}

function makeLetter(paragraphs: string[]): CoverLetter {
  return {
    greeting: "Dear Hiring Team,",
    paragraphs,
    closing: "Thank you for considering my application.",
  };
}

const match: MatchResult = {
  score: 70,
  label: "Good match",
  matchedMustHave: ["React"],
  missingMustHave: ["AWS"],
  matchedNiceToHave: [],
  missingNiceToHave: [],
  suggestions: [],
  ats: { score: 75, checks: [] },
};

function candidateResume(name: string) {
  return makeResume({
    name,
    skills: ["React"],
    experience: [
      {
        role: "Software Engineer",
        company: "Acme",
        startDate: null,
        endDate: null,
        bullets: ["Built reliable web interfaces with React."],
      },
    ],
    projects: [
      {
        name: "Calendar App",
        description: "A calendar application.",
        techStack: ["React"],
        bullets: ["Built a calendar application."],
      },
    ],
  });
}

function realGeminiResume() {
  return makeResume({
    name: "Resume Candidate",
    skills: [
      "React.js",
      "Node.js",
      "Express.js",
      "MongoDB",
      "Google Gemini API",
    ],
    experience: [
      {
        role: "Software Engineer",
        company: "Acme",
        startDate: null,
        endDate: null,
        bullets: ["Developed 15+ REST APIs for authentication."],
      },
    ],
    projects: [
      {
        name: "Wake me when",
        description: null,
        techStack: [
          "React.js",
          "Node.js",
          "Express.js",
          "MongoDB",
          "Google Gemini API",
        ],
        bullets: ["Built meeting notifications."],
      },
      {
        name: "MindMapAi",
        description: null,
        techStack: [
          "React.js",
          "Node.js",
          "Express.js",
          "MongoDB",
          "Google Gemini API",
        ],
        bullets: ["Built folder and note CRUD operations."],
      },
    ],
  });
}

const validParagraphs = [
  "The Software Engineer role fits my experience building reliable web interfaces.",
  "I built the Calendar App using React and focused on a clear user experience.",
  "My work at Acme strengthened how I contribute to practical product teams.",
];

describe("generateCoverLetter", () => {
  beforeEach(() => {
    modelNumber += 1;
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-secret-key");
    vi.stubEnv("GEMINI_MODEL", `cover-letter-test-model-${modelNumber}`);
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("retries an unsupported number, then drops the paragraph with a warning", async () => {
    const invalid = makeLetter([
      "I improved speed by 40% while building reliable interfaces.",
      ...validParagraphs.slice(1),
    ]);
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(invalid))
      .mockResolvedValueOnce(response(invalid));

    const result = await generateCoverLetter(
      candidateResume("Numbers Candidate"),
      makeJob({ jobTitle: "Software Engineer" }),
      match,
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.letter).not.toContain("40%");
    expect(result.warnings).toEqual([
      "Paragraph 1 was removed because it contained unsupported numbers.",
    ]);
  });

  it("rejects unsupported missing skills but allows a learning phrase", async () => {
    const letter = makeLetter([
      "I have strong AWS experience and can contribute to this role.",
      ...validParagraphs.slice(1),
    ]);
    const learningLetter = makeLetter([
      "I am currently learning AWS while building on my existing React experience.",
      ...validParagraphs.slice(1),
    ]);
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(letter))
      .mockResolvedValueOnce(response(learningLetter));

    const result = await generateCoverLetter(
      candidateResume("Skill Candidate"),
      makeJob({ jobTitle: "Skill-focused Software Engineer" }),
      match,
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.letter).toContain("I am currently learning AWS");
    expect(result.warnings).toEqual([]);
  });

  it("rejects a project name that is not in the resume", async () => {
    const inventedProject = makeLetter([
      ...validParagraphs.slice(0, 2),
      "Nimbus project demonstrates my ability to build practical tools.",
    ]);
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(inventedProject))
      .mockResolvedValueOnce(response(inventedProject));

    const result = await generateCoverLetter(
      candidateResume("Project Candidate"),
      makeJob({ jobTitle: "Project-focused Software Engineer" }),
      match,
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.letter).not.toContain("Project Nimbus");
    expect(result.warnings).toEqual([
      "Paragraph 3 was removed because it contained a project or company name not found in the resume or job.",
    ]);
  });

  it("accepts authentic Gemini paragraphs with resume numbers, names, and technologies", async () => {
    const paragraphs = [
      "In my MindMapAi project, I utilized React.js, Node.js, Express.js, and MongoDB to implement folder and note CRUD operations, rich-text editing with autosave, task scheduling, and JWT-protected APIs.",
      "During the development of the Wake me when project, I used React.js, Node.js, Express.js, MongoDB, and Tailwind CSS to create 15+ REST APIs for authentication, meeting logic, and notifications.",
      "In the Wake me when project, I used React.js, Node.js, Express.js, and MongoDB to build over 15 REST APIs supporting authentication and meeting logic.",
    ];
    vi.mocked(fetch).mockResolvedValue(response(makeLetter(paragraphs)));

    const result = await generateCoverLetter(
      realGeminiResume(),
      makeJob({ jobTitle: "Software Engineer" }),
      match,
    );

    expect(fetch).toHaveBeenCalledOnce();
    expect(result.warnings).toEqual([]);
    for (const paragraph of paragraphs) {
      expect(result.letter).toContain(paragraph);
    }
  });

  it("rejects unknown projects and unsupported numbers or company names", async () => {
    const paragraphs = [
      "In my CloudSync project, I built 20 microservices.",
      "I improved performance by 40% at Google.",
      "My established experience supports this role and team.",
      "I can bring careful problem-solving and clear communication to the team.",
    ];
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(makeLetter(paragraphs)))
      .mockResolvedValueOnce(response(makeLetter(paragraphs)));

    const result = await generateCoverLetter(
      realGeminiResume(),
      makeJob({ jobTitle: "Reliable Software Engineer" }),
      match,
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.letter).not.toContain("CloudSync");
    expect(result.letter).not.toContain("Google.");
    expect(result.warnings).toHaveLength(2);
  });

  it("returns 422 when fewer than two accurate paragraphs remain", async () => {
    const invalid = makeLetter([
      "I improved speed by 40% on the project.",
      "I have strong AWS experience.",
      validParagraphs[0],
    ]);
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(invalid))
      .mockResolvedValueOnce(response(invalid));

    await expect(
      generateCoverLetter(
        candidateResume("Too Few Candidate"),
        makeJob({ jobTitle: "Accuracy-focused Software Engineer" }),
        match,
      ),
    ).rejects.toMatchObject({
      constructor: AIRequestError,
      status: 422,
      message: "Could not write an accurate cover letter. Try again.",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("uses the cache for identical input", async () => {
    vi.mocked(fetch).mockResolvedValue(response(makeLetter(validParagraphs)));
    const resume = candidateResume("Cached Candidate");
    const job = makeJob({ jobTitle: "Cached Software Engineer" });

    const first = await generateCoverLetter(resume, job, match);
    const second = await generateCoverLetter(resume, job, match);

    expect(fetch).toHaveBeenCalledOnce();
    expect(first).toEqual(second);
  });
});
