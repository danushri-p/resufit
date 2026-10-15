import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  AIRequestError,
  AIUnavailableError,
  generateStructured,
} from "@/lib/ai/client";
import { generateWithGemini } from "@/lib/ai/gemini";

vi.mock("server-only", () => ({}));

const schema = z.object({ name: z.string() });

function successfulResponse(text: string): Response {
  return Response.json({
    candidates: [{ content: { parts: [{ text }] } }],
  });
}

describe("Gemini provider", () => {
  beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-secret-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-test-model");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent",
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

  it("maps Gemini 429 and 401 responses to AI request errors", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(
      generateWithGemini({
        prompt: "prompt",
        schema,
        userMessage: "text",
      }),
    ).rejects.toMatchObject({
      constructor: AIRequestError,
      message: "The free Gemini limit was reached, try again in a minute",
    });
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

  it("retries once without the schema when Gemini rejects it", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        Response.json(
          { error: { message: "responseJsonSchema is not supported" } },
          { status: 400 },
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

    expect(fetch).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    const retryBody = JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body));
    expect(firstBody.generationConfig.responseJsonSchema).toBeDefined();
    expect(retryBody.generationConfig.responseJsonSchema).toBeUndefined();
  });
});
