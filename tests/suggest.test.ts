import { afterEach, describe, expect, it, vi } from "vitest";
import { makeJob, makeResume } from "@/tests/fixtures";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/client", () => ({
  generateStructured: vi.fn().mockResolvedValue({
    suggestions: [
      { title: "learn typescript", detail: "Learn TypeScript in a small project." },
      { title: "Improve summary", detail: "Highlight your most relevant project." },
    ],
  }),
}));

import { suggestResumeImprovements } from "@/lib/ai/suggest";

afterEach(() => {
  vi.clearAllMocks();
});

describe("suggestResumeImprovements", () => {
  it("removes an AI suggestion duplicating the deterministic Learn suggestion", async () => {
    const result = await suggestResumeImprovements(
      makeResume(),
      makeJob(),
      [],
      ["TypeScript"],
      [],
    );

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions.map(({ title }) => title)).toEqual([
      "Learn TypeScript",
      "Improve summary",
    ]);
  });
});
