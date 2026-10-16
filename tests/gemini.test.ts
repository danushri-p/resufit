import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  AIRequestError,
  AIUnavailableError,
  generateStructured,
} from "@/lib/ai/client";
import { getGeminiModel, generateWithGemini } from "@/lib/ai/gemini";
import { extractBoth } from "@/lib/ai/extractBoth";
import type { Extraction } from "@/lib/schemas";

vi.mock("server-only", () => ({}));

const schema = z.object({ name: z.string() });
let modelNumber = 0;

function successfulResponse(text: string): Response {
  return Response.json({
    candidates: [{ content: { parts: [{ text }] } }],
  });
}

describe("Gemini provider", () => {
  beforeEach(() => {
    modelNumber += 1;
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-secret-key");
    vi.stubEnv("GEMINI_MODEL", `gemini-test-model-${modelNumber}`);
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends the key in a header and parses schema-valid JSON", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(successfulResponse('{"name":"Ada"}'));

    await expect(
      generateStructured({
        prompt: "Extract a name.",
        schema,
        sourceText: "Ada",
      }),
    ).resolves.toEqual({ name: "Ada" });

    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent`,
    );
    expect(String(url)).not.toContain("test-secret-key");
    expect(new Headers(request?.headers).get("x-goog-api-key")).toBe(
      "test-secret-key",
    );
    const body = JSON.parse(String(request?.body));
    expect(body.systemInstruction.parts[0].text).toBe("Extract a name.");
    expect(body.contents[0].parts[0].text).toContain("Ada");
    expect(body.generationConfig).toMatchObject({
      temperature: 0,
      responseMimeType: "application/json",
    });
    expect(body.generationConfig.responseJsonSchema).toBeDefined();
  });

  it("maps per-day Gemini 429 responses without a retry countdown", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        {
          error: {
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                violations: [{ quotaId: "GenerateRequestsPerDayPerProject" }],
              },
              {
                "@type": "type.googleapis.com/google.rpc.RetryInfo",
                retryDelay: "37s",
              },
            ],
          },
        },
        { status: 429 },
      ),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      generateWithGemini({
        prompt: "private prompt",
        schema,
        userMessage: "private user content",
      }),
    ).rejects.toMatchObject({
      constructor: AIRequestError,
      status: 429,
      message:
        "Today's free Gemini limit has been used up. It resets daily (midnight Pacific time). Please try again tomorrow.",
      retryAfterSeconds: null,
    });

    expect(errorLog).toHaveBeenCalledWith("Gemini model quota exhausted:", {
      model: getGeminiModel(),
      quotaId: "GenerateRequestsPerDayPerProject",
      retryDelay: "37s",
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("private prompt");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("private user content");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("test-secret-key");
  });

  it("uses Gemini's retry delay for per-minute 429 responses", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        {
          error: {
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                violations: [{ quotaId: "GenerateRequestsPerMinutePerProject" }],
              },
              {
                "@type": "type.googleapis.com/google.rpc.RetryInfo",
                retryDelay: "37s",
              },
            ],
          },
        },
        { status: 429 },
      ),
    );

    await expect(
      generateWithGemini({
        prompt: "prompt",
        schema,
        userMessage: "text",
      }),
    ).rejects.toMatchObject({
      constructor: AIRequestError,
      message: "The free Gemini limit was reached. Try again in 37 seconds.",
      retryAfterSeconds: 37,
    });
  });

  it("uses the one-minute fallback when Gemini 429 details are missing", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 429 }));

    await expect(
      generateWithGemini({
        prompt: "prompt",
        schema,
        userMessage: "text",
      }),
    ).rejects.toMatchObject({
      constructor: AIRequestError,
      message: "The free Gemini limit was reached. Try again in a minute.",
      retryAfterSeconds: 60,
    });
  });

  it("maps Gemini 401 responses to AI request errors", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(
      generateWithGemini({
        prompt: "prompt",
        schema,
        userMessage: "text",
      }),
    ).rejects.toMatchObject({
      constructor: AIRequestError,
      message: "Gemini authentication failed. Check GEMINI_API_KEY.",
    });
  });

  it("falls back to the next model after a 429 and succeeds", async () => {
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "gemini-test-fallback");
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              details: [
                {
                  violations: [
                    { quotaId: "GenerateRequestsPerMinutePerProject" },
                  ],
                },
                { retryDelay: "37s" },
              ],
            },
          },
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(successfulResponse('{"name":"Ada"}'));

    await expect(
      generateWithGemini({
        prompt: "prompt",
        schema,
        userMessage: "text",
      }),
    ).resolves.toBe('{"name":"Ada"}');

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls).toHaveLength(2);
    expect(String(calls[0][0])).toContain(getGeminiModel());
    expect(String(calls[1][0])).toContain("gemini-test-fallback");
  });

  it("throws the daily-limit error when all models are exhausted and skips them next time", async () => {
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "gemini-daily-fallback");
    const dailyLimitResponse = () =>
      Response.json(
        {
          error: {
            details: [
              {
                violations: [{ quotaId: "GenerateRequestsPerDayPerProject" }],
              },
            ],
          },
        },
        { status: 429 },
      );
    vi.mocked(fetch)
      .mockResolvedValueOnce(dailyLimitResponse())
      .mockResolvedValueOnce(dailyLimitResponse());

    const request = () =>
      generateWithGemini({
        prompt: "prompt",
        schema,
        userMessage: "text",
      });
    const dailyLimit = {
      constructor: AIRequestError,
      status: 429,
      message:
        "Today's free Gemini limit has been used up. It resets daily (midnight Pacific time). Please try again tomorrow.",
      retryAfterSeconds: null,
    };

    await expect(request()).rejects.toMatchObject(dailyLimit);
    expect(fetch).toHaveBeenCalledTimes(2);
    await expect(request()).rejects.toMatchObject(dailyLimit);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not fall back to another model on 401", async () => {
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "gemini-should-not-be-used");
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

    await expect(
      generateWithGemini({
        prompt: "prompt",
        schema,
        userMessage: "text",
      }),
    ).rejects.toMatchObject({
      constructor: AIRequestError,
      status: 401,
      message: "Gemini authentication failed. Check GEMINI_API_KEY.",
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("extracts both documents once, post-processes them, and caches by input", async () => {
    const resumeText =
      "Frontend Developer, Acme Corp\nCalendar\n• Integrated Google Calendar with automated checks every 5 minutes";
    const jobText =
      "Languages: Python, Java. Requires React and TypeScript for application development.";
    const extracted: Extraction = {
      resume: {
        name: "Ada",
        email: null,
        summary: null,
        skills: ["Languages: Python, Java", "python"],
        experience: [
          {
            role: "Frontend Developer",
            company: "Acme Corp",
            startDate: null,
            endDate: null,
            bullets: [],
          },
          {
            role: "Invented role",
            company: "Invented company",
            startDate: null,
            endDate: null,
            bullets: [],
          },
        ],
        projects: [
          {
            name: "Calendar",
            description: null,
            techStack: ["Tools: React, TypeScript"],
            bullets: ["Integrated Google Calendar with automated checks"],
          },
        ],
        education: [],
        certifications: [],
      },
      job: {
        jobTitle: "Engineer",
        company: null,
        mustHaveSkills: ["Languages: Python, Java", "React"],
        niceToHaveSkills: ["Tools: TypeScript"],
        yearsOfExperience: null,
        responsibilities: [],
        keywords: [],
      },
    };
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(successfulResponse(JSON.stringify(extracted))),
    );

    const first = await extractBoth(resumeText, jobText);
    const identical = await extractBoth(resumeText, jobText);

    expect(fetch).toHaveBeenCalledOnce();
    expect(first).toEqual(identical);
    expect(first.resume.skills).toEqual(["Python", "Java"]);
    expect(first.resume.experience).toHaveLength(1);
    expect(first.resume.projects[0].techStack).toEqual(["React", "TypeScript"]);
    expect(first.resume.projects[0].bullets).toEqual([
      "Integrated Google Calendar with automated checks every 5 minutes",
    ]);
    expect(first.job.mustHaveSkills).toEqual(["Python", "Java", "React"]);
    expect(first.job.niceToHaveSkills).toEqual(["TypeScript"]);

    await extractBoth(`${resumeText}\nDifferent source`, jobText);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("maps network failures to AIUnavailableError", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("network down"));

    await expect(
      generateWithGemini({
        prompt: "prompt",
        schema,
        userMessage: "text",
      }),
    ).rejects.toBeInstanceOf(AIUnavailableError);
  });

  it("does not fall back to another model for a 400 response", async () => {
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "gemini-should-not-be-used");
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        { error: { message: "responseJsonSchema is not supported" } },
        { status: 400 },
      ),
    );

    await expect(
      generateWithGemini({
        prompt: "prompt",
        schema,
        userMessage: "text",
      }),
    ).rejects.toMatchObject({
      constructor: AIRequestError,
      status: 400,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
