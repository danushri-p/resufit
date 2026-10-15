const SKILL_ALIASES: Record<string, string> = {
  reactjs: "react",
  node: "node.js",
  nodejs: "node.js",
  postgres: "postgresql",
  mongo: "mongodb",
  restapi: "rest api",
  restapis: "rest api",
  restapidesign: "rest api",
  js: "javascript",
  ts: "typescript",
};

export interface SkillMatch {
  matched: string[];
  missing: string[];
}

export function normalizeSkill(skill: string): string {
  const normalized = skill
    .toLowerCase()
    .trim()
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
): SkillMatch {
  const normalizedResumeSkills = new Set(resumeSkills.map(normalizeSkill));
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of requiredSkills) {
    (normalizedResumeSkills.has(normalizeSkill(skill)) ? matched : missing).push(
      skill,
    );
  }

  return { matched, missing };
}
