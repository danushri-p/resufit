const SKILL_ALIASES: Record<string, string> = {
  reactjs: "react",
  node: "node.js",
  nodejs: "node.js",
  postgres: "postgresql",
  mongo: "mongodb",
  geminiapi: "gemini",
  googlegeminiapi: "gemini",
  googlegemini: "gemini",
  openaiapi: "openai",
  websocket: "websockets",
  websockets: "websockets",
  githubactions: "github actions",
  restapi: "rest api",
  restapis: "rest api",
  restapidesign: "rest api",
  js: "javascript",
  ts: "typescript",
};

const CONCEPT_SKILLS: Record<string, string[]> = {
  llmapis: ["gemini", "openai", "rag", "prompt engineering"],
  llmbasedfeatures: ["gemini", "openai", "rag", "prompt engineering"],
  aifeatures: ["gemini", "openai", "rag", "prompt engineering"],
  realtimefeatures: ["websockets", "socket.io"],
  authentication: ["jwt", "oauth"],
};

export interface SkillMatch {
  matched: string[];
  missing: string[];
}

function resumeTextContainsSkill(resumeText: string, skill: string): boolean {
  if (!skill) return false;

  const words =
    resumeText.match(/[\p{L}\p{N}+#]+(?:\.[\p{L}\p{N}+#]+)*/gu) ?? [];
  for (let start = 0; start < words.length; start += 1) {
    for (let end = start + 1; end <= Math.min(start + 5, words.length); end += 1) {
      if (normalizeSkill(words.slice(start, end).join(" ")) === skill) {
        return true;
      }
    }
  }
  return false;
}

export function normalizeSkill(skill: string): string {
  const normalized = skill
    .toLowerCase()
    .trim()
    .replace(/\b(?:experience with|knowledge of|familiarity with)\b/g, " ")
    .replace(/\b(?:fundamentals|basics|basic|strong)\b/g, " ")
    .replace(/[^a-z0-9+#]/g, "");

  if (SKILL_ALIASES[normalized]) {
    return SKILL_ALIASES[normalized];
  }

  const withoutJsSuffix = normalized.replace(/js$/, "");
  return SKILL_ALIASES[withoutJsSuffix] ?? withoutJsSuffix;
}

export function matchSkills(
  resumeSkills: string[],
  requiredSkills: string[],
  resumeText?: string,
): SkillMatch {
  const normalizedResumeSkills = new Set(resumeSkills.map(normalizeSkill));
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of requiredSkills) {
    const normalizedSkill = normalizeSkill(skill);
    const conceptItems = CONCEPT_SKILLS[normalizedSkill] ?? [];
    const isMatched =
      normalizedResumeSkills.has(normalizedSkill) ||
      resumeTextContainsSkill(resumeText ?? "", normalizedSkill) ||
      conceptItems.some(
        (item) =>
          normalizedResumeSkills.has(normalizeSkill(item)) ||
          resumeTextContainsSkill(resumeText ?? "", normalizeSkill(item)),
      );

    (isMatched ? matched : missing).push(skill);
  }

  return { matched, missing };
}
