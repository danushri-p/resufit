import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIRequestError } from "@/lib/ai/errors";
import { generateInterviewPrep } from "@/lib/ai/interviewPrep";
import { makeJob, makeResume } from "@/tests/fixtures";
import type { InterviewPrep, MatchResult } from "@/lib/schemas";

vi.mock("server-only", () => ({}));

let modelNumber = 0;

function response(prep: InterviewPrep): Response {
  return Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(prep) }] } }],
  });
}

function makeQuestions(): InterviewPrep {
  return {
    questions: [
      {
        category: "technical",
        question: "How have you used React?",
        whyAsked: "The interviewer wants to understand your frontend experience.",
        answerOutline: ["Discuss your React work.", "Explain your implementation choices."],
        basedOn: "Planner",
      },
      {
        category: "gap",
        question: "How are you approaching TypeScript?",
        whyAsked: "The interviewer wants to understand your learning approach.",
        answerOutline: ["I am learning TypeScript.", "Connect it to related JavaScript work."],
        basedOn: null,
      },
      {
        category: "project",
        question: "How did you build Planner?",
        whyAsked: "The interviewer wants to learn how you deliver a project.",
        answerOutline: ["Situation: users needed a planner.", "Task: build useful planning tools."],
        basedOn: "Planner",
      },
      {
        category: "behavioral",
        question: "How do you debug a difficult issue?",
        whyAsked: "The interviewer wants to learn your problem-solving approach.",
        answerOutline: ["Describe your debugging process.", "Explain what you learned."],
        basedOn: null,
      },
      ...["planning", "reviewing", "testing", "shipping"].map((task) => ({
        category: "technical" as const,
        question: `How do you approach React ${task}?`,
        whyAsked: "The interviewer wants to understand your technical reasoning.",
        answerOutline: ["Use an example from your resume.", "Explain the trade-offs."],
        basedOn: "Planner",
      })),
    ],
  };
}

const match: MatchResult = {
  score: 70,
  label: "Good match",
  matchedMustHave: ["React"],
  missingMustHave: ["TypeScript"],
  matchedNiceToHave: [],
  missingNiceToHave: [],
  suggestions: [],
  ats: { score: 70, checks: [] },
};

function resume() {
  return makeResume({
    skills: ["React", "JavaScript"],
    projects: [
      {
        name: "Planner",
        description: null,
        techStack: ["React", "JavaScript"],
        bullets: ["Built a planner interface with React."],
      },
    ],
  });
}

describe("generateInterviewPrep", () => {
  beforeEach(() => {
    modelNumber += 1;
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-secret-key");
    vi.stubEnv("GEMINI_MODEL", `interview-prep-test-model-${modelNumber}`);
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("drops invented numbers after retry and retains accurate questions", async () => {
    const prep = makeQuestions();
    prep.questions[0].answerOutline[0] = "Improved performance by 40%.";
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(prep))
      .mockResolvedValueOnce(response(prep));

    const result = await generateInterviewPrep(resume(), makeJob(), match);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.questions.some((question) =>
      question.answerOutline.some((point) => point.includes("40%")),
    )).toBe(false);
    expect(result.warnings).toContain(
      "Question 1 was removed because it uses numbers not found in the resume.",
    );
  });

  it("clears an unsupported basedOn name and rejects false technical claims while allowing learning", async () => {
    const prep = makeQuestions();
    prep.questions[0].basedOn = "Made-up Project";
    prep.questions[0].answerOutline[0] = "I have strong TypeScript experience.";
    prep.questions[2].basedOn = "Made-up Project";
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(prep))
      .mockResolvedValueOnce(response(prep));

    const result = await generateInterviewPrep(resume(), makeJob(), match);

    expect(result.questions.find((question) => question.category === "gap"))
      .toMatchObject({ answerOutline: expect.arrayContaining(["I am learning TypeScript."]) });
    expect(result.questions.find((question) => question.question === "How did you build Planner?")?.basedOn)
      .toBeNull();
    expect(result.questions.some((question) =>
      question.answerOutline.includes("I have strong TypeScript experience."),
    )).toBe(false);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        "Question 1 had an unsupported resume reference removed.",
        "Question 3 had an unsupported resume reference removed.",
      ]),
    );
  });

  it("returns 422 when fewer than five accurate questions remain after retry", async () => {
    const prep = makeQuestions();
    prep.questions.forEach((question, index) => {
      question.answerOutline[0] = `Improved performance by ${40 + index}%.`;
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(prep))
      .mockResolvedValueOnce(response(prep));

    await expect(generateInterviewPrep(resume(), makeJob(), match)).rejects.toMatchObject({
      constructor: AIRequestError,
      status: 422,
      message: "Could not prepare accurate interview questions. Try again.",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("replaces a project Result line that is unsupported by that project's bullets", async () => {
    const prep = makeQuestions();
    prep.questions[2].answerOutline.push(
      "Result: users completed tasks more quickly.",
    );
    prep.questions[2].answerOutline.push(
      "Result: the planner interface supported clearer organization.",
    );
    vi.mocked(fetch).mockResolvedValueOnce(response(prep));

    const result = await generateInterviewPrep(
      resume(),
      makeJob({ jobTitle: "Project outcomes role" }),
      match,
    );

    expect(result.questions[2].answerOutline).toContain(
      "Result: [describe the outcome in your words]",
    );
    expect(result.questions[2].answerOutline).not.toContain(
      "Result: users completed tasks more quickly.",
    );
    expect(result.questions[2].answerOutline).toContain(
      "Result: the planner interface supported clearer organization.",
    );
    expect(result.warnings).toContain(
      "Question 3 had an unsupported Result line replaced with a placeholder.",
    );
  });

  it("drops hedging language from answer outline bullets", async () => {
    const prep = makeQuestions();
    prep.questions[0].answerOutline.push(
      "This likely, probably, may have, or might have improved the user experience.",
    );
    vi.mocked(fetch).mockResolvedValueOnce(response(prep));

    const result = await generateInterviewPrep(
      resume(),
      makeJob({ jobTitle: "Evidence-based role" }),
      match,
    );

    expect(result.questions[0].answerOutline).not.toContain(
      "This likely, probably, may have, or might have improved the user experience.",
    );
    expect(result.warnings).toContain(
      "Question 1 had hedging language removed from its answer outline.",
    );
  });

  it("uses the cache for identical input", async () => {
    vi.mocked(fetch).mockResolvedValue(response(makeQuestions()));
    const inputResume = resume();
    const job = makeJob({ jobTitle: "Cached role" });

    const first = await generateInterviewPrep(inputResume, job, match);
    const second = await generateInterviewPrep(inputResume, job, match);

    expect(fetch).toHaveBeenCalledOnce();
    expect(first).toEqual(second);
  });
});
