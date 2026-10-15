import { describe, expect, it } from "vitest";
import {
  containsUnsupportedNumbers,
  mentionsMissingSkill,
  repeatsQuotedText,
  shouldDropSuggestion,
} from "@/lib/ai/guards";

describe("suggestion honesty guards", () => {
  it.each([
    ["Add PostgreSQL to existing bullet points", ["PostgreSQL"]],
    ["Implemented cloud-based authentication using AWS Cognito", ["AWS"]],
  ])("drops unsupported skill claims", (detail, missingSkills) => {
    expect(
      shouldDropSuggestion({ title: "Improve bullet", detail }, "", missingSkills),
    ).toBe(true);
  });

  it("drops repeated quoted text", () => {
    const detail = "Instead of 'REST API design', use 'REST API design'.";
    expect(repeatsQuotedText(detail)).toBe(true);
    expect(shouldDropSuggestion({ title: "Rewrite", detail }, "", [])).toBe(true);
  });

  it("drops invented percentages", () => {
    expect(
      containsUnsupportedNumbers(
        { title: "Add a result", detail: "Show a 30% increase." },
        "",
      ),
    ).toBe(true);
  });

  it("keeps learning suggestions about missing skills", () => {
    const detail = "Take a course on AWS and build a small side project.";
    expect(mentionsMissingSkill(detail, ["AWS"])).toBe(true);
    expect(shouldDropSuggestion({ title: "Learn AWS", detail }, "", ["AWS"])).toBe(
      false,
    );
  });

  it("keeps project ordering and contractions", () => {
    expect(
      shouldDropSuggestion(
        { title: "Reorder", detail: "Move MeetAlert project first." },
        "",
        ["AWS"],
      ),
    ).toBe(false);
    expect(mentionsMissingSkill("you're improving MeetAlert's bullets", ["AWS"])).toBe(
      false,
    );
  });

  it("allows metric placeholders", () => {
    expect(
      containsUnsupportedNumbers(
        { title: "Quantify", detail: "Add a [X%] result after checking your data." },
        "",
      ),
    ).toBe(false);
  });
});
