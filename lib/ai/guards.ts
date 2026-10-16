import { normalizeSkill } from "@/lib/matching/skills";
import type { BulletRewrite } from "@/lib/schemas";

export function containsUnsupportedNumbers(
  suggestion: { title: string; detail: string },
  resumeText: string,
): boolean {
  const content = `${suggestion.title}\n${suggestion.detail}`.replace(
    /\[(?:x%?|number)\]/gi,
    "",
  );

  if (/\d+(?:[.,]\d+)*\s*(?:%|percent\b)/i.test(content)) {
    return true;
  }

  const resumeNumbers = new Set(
    resumeText.match(/\d+(?:[.,]\d+)*(?:\+)?/g)?.map((number) =>
      number.replace(/,/g, "").replace(/\+$/, ""),
    ) ?? [],
  );
  const suggestionNumbers =
    content.match(/\d+(?:[.,]\d+)*(?:\+)?/g) ?? [];

  return suggestionNumbers.some(
    (number) =>
      !resumeNumbers.has(number.replace(/,/g, "").replace(/\+$/, "")),
  );
}

export function mentionsMissingSkill(content: string, missingSkills: string[]): boolean {
  const words =
    content.match(/[\p{L}\p{N}+#]+(?:\.[\p{L}\p{N}+#]+)*/gu) ?? [];
  const normalizedMissingSkills = new Set(
    missingSkills.map(normalizeSkill).filter(Boolean),
  );

  for (let start = 0; start < words.length; start += 1) {
    for (let end = start + 1; end <= Math.min(start + 5, words.length); end += 1) {
      if (normalizedMissingSkills.has(normalizeSkill(words.slice(start, end).join(" ")))) {
        return true;
      }
    }
  }

  return false;
}

export function containsLearningPhrase(content: string): boolean {
  return /\b(?:learn(?:ing)?|build a|practice|course|tutorial|side project)\b/i.test(
    content,
  );
}

export function repeatsQuotedText(detail: string): boolean {
  const quotedText = Array.from(
    detail.matchAll(/["'`]([^"'`]+)["'`]|“([^”]+)”|‘([^’]+)’/g),
    (match) => (match[1] ?? match[2] ?? match[3]).trim().toLowerCase(),
  );

  return new Set(quotedText).size < quotedText.length;
}

export function shouldDropSuggestion(
  suggestion: { title: string; detail: string },
  resumeText: string,
  missingSkills: string[],
): boolean {
  const content = `${suggestion.title}\n${suggestion.detail}`;

  return (
    containsUnsupportedNumbers(suggestion, resumeText) ||
    (mentionsMissingSkill(content, missingSkills) &&
      !containsLearningPhrase(content)) ||
    repeatsQuotedText(suggestion.detail)
  );
}

export function canUseRewrite(
  rewrite: BulletRewrite,
  projectTechStack: string[],
  missingSkills: string[],
  knownTechnologies: string[],
): boolean {
  const original = rewrite.original.trim();
  const rewritten = rewrite.rewritten.trim();

  if (
    rewritten === original ||
    !containsOriginalNumbers(original, rewritten) ||
    containsUnsupportedNumbers(
      { title: "", detail: rewritten },
      original,
    ) ||
    mentionsMissingSkill(
      rewritten,
      missingSkills.filter(
        (skill) => !mentionsMissingSkill(original, [skill]),
      ),
    )
  ) {
    return false;
  }

  const originalTechnologies = knownTechnologies.filter((technology) =>
    mentionsMissingSkill(original, [technology]),
  );
  const allowedTechnologies =
    originalTechnologies.length > 0 ? originalTechnologies : projectTechStack;
  const disallowedTechnologies = knownTechnologies.filter(
    (technology) =>
      !allowedTechnologies.some(
        (allowedTechnology) =>
          normalizeSkill(allowedTechnology) === normalizeSkill(technology),
      ),
  );

  return !mentionsMissingSkill(rewritten, disallowedTechnologies);
}

function containsOriginalNumbers(original: string, rewritten: string): boolean {
  const numbersInOriginal =
    original.match(/\d+(?:[.,]\d+)*(?:\+)?/g)?.map((number) =>
      number.replace(/,/g, ""),
    ) ?? [];
  const numbersInRewrite = new Set(
    rewritten.match(/\d+(?:[.,]\d+)*(?:\+)?/g)?.map((number) =>
      number.replace(/,/g, ""),
    ) ?? [],
  );

  return numbersInOriginal.every((number) => numbersInRewrite.has(number));
}
