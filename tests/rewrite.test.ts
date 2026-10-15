import { describe, expect, it } from "vitest";
import { canUseRewrite } from "@/lib/ai/guards";

describe("canUseRewrite", () => {
  it("rejects technologies added to a bullet that already names a technology", () => {
    const original = "Implemented JWT-protected APIs and rich-text editing";
    const rewrite =
      "...rich-text editing using Express and Gemini";
    const techStack = ["Gemini", "Node.js", "Express.js", "JWT"];

    expect(
      canUseRewrite(
        { original, rewritten: rewrite, reason: "Adds tools" },
        techStack,
        [],
        techStack,
      ),
    ).toBe(false);
  });

  it("rejects technologies added to an existing REST API bullet", () => {
    const original =
      "Developed 15+ REST APIs for authentication and notifications";
    const rewritten =
      "Created a robust REST API framework for authentication and notifications using Express and Node.js";
    const techStack = ["React.js", "Node.js", "REST APIs", "JWT"];

    expect(
      canUseRewrite(
        { original, rewritten, reason: "Improves wording" },
        techStack,
        [],
        [...techStack, "Express"],
      ),
    ).toBe(false);
  });

  it("allows project technologies when the original bullet names none", () => {
    const original =
      "Built a full-stack AI-powered meeting alert application";
    const rewritten =
      "Designed and developed a full-stack AI-powered meeting alert application using React and Node.js";
    const techStack = ["React.js", "Node.js", "REST APIs", "JWT"];

    expect(
      canUseRewrite(
        { original, rewritten, reason: "Names project technologies" },
        techStack,
        [],
        techStack,
      ),
    ).toBe(true);
  });

  it("rejects a rewrite identical to the original after trimming", () => {
    const original = "Built an application";

    expect(
      canUseRewrite(
        { original, rewritten: `  ${original}  `, reason: "No change" },
        ["React"],
        [],
        ["React"],
      ),
    ).toBe(false);
  });

  it("rejects a rewrite that mentions a missing skill", () => {
    expect(
      canUseRewrite(
        {
          original: "Built an application",
          rewritten: "Built an application with TypeScript",
          reason: "Adds a tool",
        },
        ["React"],
        ["TypeScript"],
        ["React", "TypeScript"],
      ),
    ).toBe(false);
  });
});
