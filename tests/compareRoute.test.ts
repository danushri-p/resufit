import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/compare/route";
import { compareResumeToJobs } from "@/lib/compare";
import { consumeAIRequest } from "@/lib/ai/limits";
import { makeResume } from "@/tests/fixtures";
import type { MatchResult } from "@/lib/schemas";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/limits", () => ({
  consumeAIRequest: vi.fn(() => true),
  getRequestIp: vi.fn(() => "127.0.0.1"),
  MAX_RESUME_TEXT_LENGTH: 20_000,
  MAX_JOB_TEXT_LENGTH: 10_000,
}));
vi.mock("@/lib/compare", () => ({
  compareResumeToJobs: vi.fn(),
}));

const validJobs = [
  "Frontend position requiring React and TypeScript skills.".padEnd(60, " "),
  "Backend position requiring Node.js and database skills.".padEnd(60, " "),
];

const match: MatchResult = {
  score: 70,
  label: "Good match",
  matchedMustHave: [],
  missingMustHave: [],
  matchedNiceToHave: [],
  missingNiceToHave: [],
  suggestions: [],
  ats: { score: 70, checks: [] },
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/compare", () => {
  beforeEach(() => {
    vi.mocked(compareResumeToJobs).mockReset();
    vi.mocked(compareResumeToJobs).mockResolvedValue({
      resume: makeResume(),
      jobs: [0, 1].map((index) => ({
        index,
        job: {
          jobTitle: `Job ${index + 1}`,
          company: null,
          mustHaveSkills: [],
          niceToHaveSkills: [],
          yearsOfExperience: null,
          responsibilities: [],
          keywords: [],
        },
        match,
        atsKeywordCoverage: 100,
      })),
      skillGaps: [],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["one job", [validJobs[0]]],
    ["four jobs", [...validJobs, validJobs[0], validJobs[1]]],
  ])("rejects %s", async (_label, jobTexts) => {
    const response = await POST(
      request({ resumeText: "resume", jobTexts }),
    );
    expect(response.status).toBe(400);
    expect(compareResumeToJobs).not.toHaveBeenCalled();
  });

  it("rejects a job description over 10,000 characters", async () => {
    const response = await POST(
      request({
        resumeText: "resume",
        jobTexts: [validJobs[0], "x".repeat(10_001)],
      }),
    );
    expect(response.status).toBe(400);
    expect(compareResumeToJobs).not.toHaveBeenCalled();
  });

  it("rejects resume text over 20,000 characters", async () => {
    const response = await POST(
      request({
        resumeText: "x".repeat(20_001),
        jobTexts: validJobs,
      }),
    );
    expect(response.status).toBe(400);
  });

  it("reserves one rate-limit unit for the resume and each job extraction", async () => {
    const response = await POST(
      request({ resumeText: "resume", jobTexts: validJobs }),
    );

    expect(response.status).toBe(200);
    expect(consumeAIRequest).toHaveBeenCalledWith(
      "127.0.0.1",
      expect.any(Number),
      3,
    );
  });

  it("returns a retryable 429 when the per-request budget is exhausted", async () => {
    const { consumeAIRequest } = await import("@/lib/ai/limits");
    vi.mocked(consumeAIRequest).mockReturnValueOnce(false);

    const response = await POST(
      request({ resumeText: "resume", jobTexts: validJobs }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: "You've made too many AI requests. Please wait a minute and try again.",
      retryAfterSeconds: 60,
    });
    expect(compareResumeToJobs).not.toHaveBeenCalled();
  });
});
