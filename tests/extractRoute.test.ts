import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/extract/route";
import { extractJD } from "@/lib/ai/extractJD";
import { extractResume } from "@/lib/ai/extractResume";
import { AIRequestError } from "@/lib/ai/errors";
import type { JobRequirements, Resume } from "@/lib/schemas";
import { makeJob, makeResume } from "@/tests/fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/extractJD", () => ({
  extractJD: vi.fn(),
}));
vi.mock("@/lib/ai/extractResume", () => ({
  extractResume: vi.fn(),
}));
vi.mock("@/lib/ai/limits", () => ({
  consumeAIRequest: vi.fn(() => true),
  getRequestIp: vi.fn(() => "127.0.0.1"),
  getTextLimitError: vi.fn(() => undefined),
}));

const requestBody = {
  resumeText: "Resume text",
  jobText: "A job description with more than fifty characters for extraction.",
};

function makeRequest(): Request {
  return new Request("http://localhost/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
}

describe("POST /api/extract", () => {
  beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.mocked(extractResume).mockReset();
    vi.mocked(extractJD).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("runs Gemini resume and job extraction sequentially", async () => {
    let resolveResume!: (resume: Resume) => void;
    vi.mocked(extractResume).mockReturnValue(
      new Promise((resolve) => {
        resolveResume = resolve;
      }),
    );
    vi.mocked(extractJD).mockResolvedValue(makeJob());

    const responsePromise = POST(makeRequest());
    await vi.waitFor(() => expect(extractResume).toHaveBeenCalledOnce());
    expect(extractJD).not.toHaveBeenCalled();

    resolveResume(makeResume());
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(extractJD).toHaveBeenCalledOnce();
  });

  it("keeps extraction concurrent for non-Gemini providers", async () => {
    vi.stubEnv("AI_PROVIDER", "ollama");
    let resolveResume!: (resume: Resume) => void;
    let resolveJob!: (job: JobRequirements) => void;
    vi.mocked(extractResume).mockReturnValue(
      new Promise((resolve) => {
        resolveResume = resolve;
      }),
    );
    vi.mocked(extractJD).mockReturnValue(
      new Promise((resolve) => {
        resolveJob = resolve;
      }),
    );

    const responsePromise = POST(makeRequest());
    await vi.waitFor(() => {
      expect(extractResume).toHaveBeenCalledOnce();
      expect(extractJD).toHaveBeenCalledOnce();
    });

    resolveResume(makeResume());
    resolveJob(makeJob());
    expect((await responsePromise).status).toBe(200);
  });

  it("passes Gemini retry seconds through the 429 JSON response", async () => {
    vi.mocked(extractResume).mockRejectedValue(
      new AIRequestError(
        429,
        "The free Gemini limit was reached. Try again in 37 seconds.",
        37,
      ),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: "The free Gemini limit was reached. Try again in 37 seconds.",
      retryAfterSeconds: 37,
    });
  });

  it("passes a null retry delay for daily Gemini quota errors", async () => {
    vi.mocked(extractResume).mockRejectedValue(
      new AIRequestError(
        429,
        "Today's free Gemini limit has been used up. It resets daily (midnight Pacific time). Please try again tomorrow.",
        null,
      ),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error:
        "Today's free Gemini limit has been used up. It resets daily (midnight Pacific time). Please try again tomorrow.",
      retryAfterSeconds: null,
    });
  });
});
