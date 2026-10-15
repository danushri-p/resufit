import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

const { generateWithGemini } = vi.hoisted(() => ({
  generateWithGemini: vi.fn(),
}));

vi.mock("@/lib/ai/gemini", () => ({ generateWithGemini }));

import { generateStructured } from "@/lib/ai/client";

const schema = z.object({ provider: z.string() });
const options = {
  prompt: "prompt",
  schema,
  sourceText: "source",
};

describe("AI provider selection", () => {
  beforeEach(() => {
    generateWithGemini.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses Ollama by default", async () => {
    delete process.env.AI_PROVIDER;
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ message: { content: '{"provider":"ollama"}' } }),
    );

    await expect(generateStructured(options)).resolves.toEqual({
      provider: "ollama",
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/chat",
      expect.any(Object),
    );
    expect(generateWithGemini).not.toHaveBeenCalled();
  });

  it("uses Gemini when AI_PROVIDER=gemini", async () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    generateWithGemini.mockResolvedValue('{"provider":"gemini"}');

    await expect(generateStructured(options)).resolves.toEqual({
      provider: "gemini",
    });
    expect(generateWithGemini).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });
});
