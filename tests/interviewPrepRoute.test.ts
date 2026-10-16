import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/interview-prep/route";
import { generateInterviewPrep } from "@/lib/ai/interviewPrep";
import { AIRequestError } from "@/lib/ai/errors";
import { makeJob, makeResume } from "@/tests/fixtures";
import type { MatchResult } from "@/lib/schemas";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/limits", () => ({
  consumeAIRequest: vi.fn(() => true),
  getRequestIp: vi.fn(() => "127.0.0.1"),
  getTextLimitError: vi.fn(() => undefined),
}));
vi.mock("@/lib/ai/interviewPrep", () => ({
  generateInterviewPrep: vi.fn(),
}));

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

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/interview-prep", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/interview-prep", () => {
  beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.mocked(generateInterviewPrep).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an invalid request body", async () => {
    const response = await POST(makeRequest({ resume: {} }));

    expect(response.status).toBe(400);
    expect(generateInterviewPrep).not.toHaveBeenCalled();
  });

  it("returns retryAfterSeconds for quota errors", async () => {
    vi.mocked(generateInterviewPrep).mockRejectedValue(
      new AIRequestError(
        429,
        "The free Gemini limit was reached. Try again in 37 seconds.",
        37,
      ),
    );

    const response = await POST(
      makeRequest({ resume: makeResume(), job: makeJob(), match }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: "The free Gemini limit was reached. Try again in 37 seconds.",
      retryAfterSeconds: 37,
    });
  });
});
