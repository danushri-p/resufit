import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze/route";
import { AIRequestError } from "@/lib/ai/errors";
import { suggestResumeImprovements } from "@/lib/ai/suggest";
import { makeJob, makeResume } from "@/tests/fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/limits", () => ({
  consumeAIRequest: vi.fn(() => true),
  getRequestIp: vi.fn(() => "127.0.0.1"),
  getTextLimitError: vi.fn(() => undefined),
}));
vi.mock("@/lib/ai/suggest", () => ({
  suggestResumeImprovements: vi.fn(),
}));

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.mocked(suggestResumeImprovements).mockRejectedValue(
      new AIRequestError(
        429,
        "Today's free Gemini limit has been used up. It resets daily (midnight Pacific time). Please try again tomorrow.",
        null,
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns deterministic match and ATS results when suggestions hit the daily limit", async () => {
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume: makeResume({ skills: ["TypeScript"] }),
        job: makeJob({ mustHaveSkills: ["TypeScript", "React"] }),
        resumeText: "TypeScript resume",
        jobText: "A job description requiring TypeScript and React.",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.score).toEqual(expect.any(Number));
    expect(payload.ats).toEqual(
      expect.objectContaining({
        score: expect.any(Number),
        checks: expect.any(Array),
      }),
    );
    expect(payload.matchedMustHave).toContain("TypeScript");
    expect(payload.suggestions).toEqual([]);
    expect(payload.suggestionsError).toBe(
      "Suggestions are unavailable right now (daily AI limit). Your score and ATS check are complete.",
    );
  });
});
