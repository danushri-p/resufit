import { describe, expect, it } from "vitest";
import { runAtsChecks } from "@/lib/ats";
import { makeJob, makeResume } from "@/tests/fixtures";

function run(resumeText: string, overrides: Parameters<typeof makeResume>[0] = {}, jobOverrides: Parameters<typeof makeJob>[0] = {}) {
  return runAtsChecks({
    resumeText,
    resume: makeResume(overrides),
    job: makeJob(jobOverrides),
  });
}

const enoughWords = Array.from({ length: 300 }, (_, index) => `word${index}`).join(" ");
const headings = "\nSkills\nEducation\nExperience\n";
const contact = "taylor@example.com 555-123-4567";

describe("runAtsChecks", () => {
  it("checks contact pass, warn, and fail", () => {
    expect(run(`${enoughWords}${headings}${contact}`).checks[0].status).toBe("pass");
    expect(run(`${enoughWords}${headings}taylor@example.com`).checks[0].status).toBe("warn");
    expect(run(`${enoughWords}${headings}`).checks[0].status).toBe("fail");
  });

  it("does not treat year ranges as phone numbers", () => {
    expect(run("2023 - 2027").checks[0].status).toBe("fail");
    expect(run("2021-2025").checks[0].status).toBe("fail");
    expect(run("+91 98765 43210").checks[0].status).toBe("warn");
    expect(run("(555) 123-4567").checks[0].status).toBe("warn");
  });

  it("checks required section headings", () => {
    expect(run(`${enoughWords}${contact}${headings}`).checks[1].status).toBe("pass");
    expect(run(`${enoughWords}${contact}\nSkills\nEducation`).checks[1].status).toBe("warn");
    expect(run(`${enoughWords}${contact}\nSkills`).checks[1].status).toBe("fail");
  });

  it("accepts common section heading variants", () => {
    const variants = [
      ["Skills", "Technical Skills", "Skills & Tools:", "Core Skills", "Key Skills"],
      ["Education", "Academic Background", "Education & Certifications:"],
      [
        "Experience",
        "Work Experience",
        "Professional Experience",
        "Internships",
        "Projects",
        "Academic Projects",
        "Personal Projects",
      ],
    ];
    const defaults = ["Skills", "Education", "Experience"];

    for (const [groupIndex, group] of variants.entries()) {
      for (const heading of group) {
        const resumeHeadings = [...defaults];
        resumeHeadings[groupIndex] = heading;
        expect(run(`${resumeHeadings.join("\n")}\n${contact}`).checks[1].status).toBe("pass");
      }
    }
  });

  it("checks the length thresholds", () => {
    expect(run(`${contact}${headings}${"w ".repeat(300)}`).checks[2].status).toBe("pass");
    expect(run(`${contact}${headings}${"w ".repeat(250)}`).checks[2].status).toBe("warn");
    expect(run(`${contact}${headings}${"w ".repeat(950)}`).checks[2].status).toBe("warn");
    expect(run(`${contact}${headings}${"w ".repeat(100)}`).checks[2].status).toBe("fail");
    expect(run(`${contact}${headings}${"w ".repeat(1300)}`).checks[2].status).toBe("fail");
  });

  it("checks keyword thresholds and normalizes skill aliases", () => {
    const resumeText = `${"word ".repeat(300)}${contact}${headings}\nReact.js Alpha Beta Gamma Delta Epsilon Zeta`;
    expect(run(resumeText, {}, { mustHaveSkills: ["React"] }).checks[3].status).toBe("pass");
    expect(
      run(resumeText, {}, { mustHaveSkills: ["React", "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa"] }).checks[3].status,
    ).toBe("warn");
    expect(
      run(resumeText, {}, { mustHaveSkills: ["React", "Alpha", "Missing 1", "Missing 2"] }).checks[3].status,
    ).toBe("warn");
    expect(
      run(resumeText, {}, { mustHaveSkills: ["Missing 1", "Missing 2", "Missing 3"] }).checks[3].status,
    ).toBe("fail");
  });

  it("uses only skill lists, deduplicates them and excludes the job title", () => {
    const output = run("Resume text", {}, {
      jobTitle: "Node.js",
      mustHaveSkills: ["Postgres"],
      niceToHaveSkills: ["PostgreSQL", "Node.js", "Git"],
      keywords: ["Bengaluru", "Hybrid", "Intern", "PostgreSQL"],
    });

    expect(output.checks[3].detail).toBe(
      "Your resume is missing Postgres, Git job keywords.",
    );
  });

  it("does not use keywords when the skill lists are empty", () => {
    const output = run("Resume text", {}, {
      keywords: ["Bengaluru", "Hybrid", "Intern"],
    });

    expect(output.checks[3].detail).toBe(
      "Your resume includes all listed job keywords.",
    );
  });

  it("checks action verb shares at fail, warn, and pass levels", () => {
    const bullets = (verbs: string[]) => verbs.map((bullet) => bullet);
    const fail = run(`${enoughWords}${headings}${contact}`, {
      projects: [{ name: "App", description: null, techStack: [], bullets: bullets(["Did work", "Helped team", "Managed tasks"]) }],
    });
    const warn = run(`${enoughWords}${headings}${contact}`, {
      projects: [{ name: "App", description: null, techStack: [], bullets: bullets(["Built app", "Created page", "Helped team", "Managed tasks"]) }],
    });
    const pass = run(`${enoughWords}${headings}${contact}`, {
      projects: [{ name: "App", description: null, techStack: [], bullets: bullets(["Built app", "Created page", "Led team"]) }],
    });
    expect(fail.checks[4].status).toBe("fail");
    expect(warn.checks[4].status).toBe("warn");
    expect(pass.checks[4].status).toBe("pass");
  });

  it("checks metrics and averages check scores", () => {
    expect(run(`${enoughWords}${headings}${contact}`).checks[5].status).toBe("warn");
    const output = run(`${enoughWords}${headings}${contact}`, {
      projects: [{ name: "App", description: null, techStack: [], bullets: ["Built 2 features"] }],
    });
    expect(output.checks[5].status).toBe("pass");
    expect(output.score).toBe(
      Math.round(output.checks.reduce((total, check) => total + (check.status === "pass" ? 100 : check.status === "warn" ? 50 : 0), 0) / output.checks.length),
    );
    expect(output.checks.every((check) => /you|your/i.test(check.detail))).toBe(true);
  });
});
