import { describe, expect, it, vi } from "vitest";
import { POST as extractRoute } from "@/app/api/extract/route";
import {
  AI_REQUESTS_PER_MINUTE,
  MAX_JOB_TEXT_LENGTH,
  MAX_RESUME_TEXT_LENGTH,
  consumeAIRequest,
  getTextLimitError,
} from "@/lib/ai/limits";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/extractResume", () => ({
  extractResume: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/ai/extractJD", () => ({
  extractJD: vi.fn().mockResolvedValue({}),
}));

describe("AI request limits", () => {
  it("accepts texts at the limits and rejects longer resume and job text", () => {
    expect(
      getTextLimitError(
        "r".repeat(MAX_RESUME_TEXT_LENGTH),
        "j".repeat(MAX_JOB_TEXT_LENGTH),
      ),
    ).toBeUndefined();
    expect(
      getTextLimitError("r".repeat(MAX_RESUME_TEXT_LENGTH + 1), "job"),
    ).toContain("Resume text");
    expect(
      getTextLimitError("resume", "j".repeat(MAX_JOB_TEXT_LENGTH + 1)),
    ).toContain("Job description");
  });

  it("allows ten requests per IP per minute and rejects the eleventh", () => {
    const ip = `limits-test-${Date.now()}`;
    const start = Date.now();

    for (let index = 0; index < AI_REQUESTS_PER_MINUTE; index += 1) {
      expect(consumeAIRequest(ip, start)).toBe(true);
    }
    expect(consumeAIRequest(ip, start)).toBe(false);
    expect(consumeAIRequest(ip, start + 60_000)).toBe(true);
  });

  it("returns 400 for over-limit text and 429 on the eleventh API request", async () => {
    const overLimitResponse = await extractRoute(
      new Request("http://localhost/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: "r".repeat(MAX_RESUME_TEXT_LENGTH + 1),
          jobText: "j".repeat(50),
        }),
      }),
    );
    expect(overLimitResponse.status).toBe(400);

    const ip = `extract-route-test-${Date.now()}`;
    let lastResponse: Response | undefined;
    for (let index = 0; index < AI_REQUESTS_PER_MINUTE + 1; index += 1) {
      lastResponse = await extractRoute(
        new Request("http://localhost/api/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": ip,
          },
          body: JSON.stringify({
            resumeText: "resume",
            jobText: "A job description that is long enough for validation.",
          }),
        }),
      );
      if (index < AI_REQUESTS_PER_MINUTE) {
        expect(lastResponse.status).toBe(200);
      }
    }

    expect(lastResponse?.status).toBe(429);
    await expect(lastResponse?.json()).resolves.toEqual({
      error: "You've made too many AI requests. Please wait a minute and try again.",
    });
  });
});
