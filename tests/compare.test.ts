import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compareResumeToJobs } from "@/lib/compare";
import { getGeminiModel } from "@/lib/ai/gemini";
import type { JobRequirements, Resume } from "@/lib/schemas";

vi.mock("server-only", () => ({}));

let modelNumber = 0;

function successfulResponse(value: unknown): Response {
  return Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  });
}

const resume: Resume = {
  name: "Casey Example",
  email: "casey@example.com",
  summary: "Frontend and backend developer.",
  skills: ["React.js", "Node.js"],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
};

const frontendJob: JobRequirements = {
  jobTitle: "Frontend Engineer",
  company: "BrightPath",
  mustHaveSkills: ["React", "TypeScript"],
  niceToHaveSkills: ["CSS"],
  yearsOfExperience: null,
  responsibilities: [],
  keywords: [],
};

const backendJob: JobRequirements = {
  jobTitle: "Backend Engineer",
  company: "Harborlight",
  mustHaveSkills: ["Node.js", "TypeScript", "PostgreSQL"],
  niceToHaveSkills: [],
  yearsOfExperience: null,
  responsibilities: [],
  keywords: [],
};

describe("compareResumeToJobs", () => {
  beforeEach(() => {
    modelNumber += 1;
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-secret-key");
    vi.stubEnv("GEMINI_MODEL", `compare-test-model-${modelNumber}`);
    vi.stubEnv("GEMINI_FALLBACK_MODELS", "");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("extracts the resume once, ranks job results, and aggregates normalized skill gaps", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(successfulResponse(resume))
      .mockResolvedValueOnce(successfulResponse(frontendJob))
      .mockResolvedValueOnce(successfulResponse(backendJob));

    const result = await compareResumeToJobs(
      "Casey Example React.js Node.js resume text",
      [
        "Frontend job description requiring React and TypeScript.".padEnd(70, " "),
        "Backend job description requiring Node.js, TypeScript, PostgreSQL.".padEnd(70, " "),
      ],
    );

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.jobs.map((job) => job.index)).toEqual([1, 0]);
    expect(result.jobs[0].match?.score).toBeGreaterThan(result.jobs[1].match?.score ?? 0);
    expect(result.skillGaps).toEqual([
      {
        skill: "TypeScript",
        missingIn: 2,
        jobTitles: ["Frontend Engineer", "Backend Engineer"],
      },
      {
        skill: "PostgreSQL",
        missingIn: 1,
        jobTitles: ["Backend Engineer"],
      },
    ]);
    const resumeModelUrl = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(resumeModelUrl).toContain(encodeURIComponent(getGeminiModel()));
  });

  it("continues when one job extraction fails", async () => {
    const resumeText = "Unique partial resume React.js Node.js text";
    const frontendText = "Unique partial frontend job requiring React and TypeScript.".padEnd(70, " ");
    const backendText = "Unique partial backend job requiring Node.js and PostgreSQL.".padEnd(70, " ");
    vi.mocked(fetch)
      .mockResolvedValueOnce(successfulResponse(resume))
      .mockResolvedValueOnce(successfulResponse(frontendJob))
      .mockResolvedValueOnce(new Response(null, { status: 400 }));

    const first = await compareResumeToJobs(resumeText, [
      frontendText,
      backendText,
    ]);

    expect(first.jobs[0].match).toBeDefined();
    expect(first.jobs[1].error).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(3);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(first.jobs.find((entry) => entry.index === 0)?.match).toBeDefined();
    expect(first.jobs.find((entry) => entry.index === 1)?.error).toBeDefined();
  });

  it("uses one resume extraction and one extraction per job, then makes no fetches for cached inputs", async () => {
    const resumeText = "Unique all-cached resume React.js Node.js text";
    const frontendText = "Unique all-cached frontend job requiring React and TypeScript.".padEnd(70, " ");
    const backendText = "Unique all-cached backend job requiring Node.js and PostgreSQL.".padEnd(70, " ");
    vi.mocked(fetch)
      .mockResolvedValueOnce(successfulResponse(resume))
      .mockResolvedValueOnce(successfulResponse(frontendJob))
      .mockResolvedValueOnce(successfulResponse(backendJob));

    const first = await compareResumeToJobs(resumeText, [
      frontendText,
      backendText,
    ]);
    expect(fetch).toHaveBeenCalledTimes(3);

    const cached = await compareResumeToJobs(resumeText, [
      frontendText,
      backendText,
    ]);
    expect(cached).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("deduplicates React.js and React when aggregating gaps across jobs", async () => {
    const normalizedResume = { ...resume, skills: ["Node.js"] };
    const requiresReactJs = {
      ...frontendJob,
      mustHaveSkills: ["React.js"],
    };
    const requiresReact = {
      ...backendJob,
      mustHaveSkills: ["React"],
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(successfulResponse(normalizedResume))
      .mockResolvedValueOnce(successfulResponse(requiresReactJs))
      .mockResolvedValueOnce(successfulResponse(requiresReact));

    const result = await compareResumeToJobs(
      "A distinct resume with backend experience only.",
      [
        "A distinct frontend job description requiring React.js.".padEnd(70, " "),
        "A distinct backend job description requiring React.".padEnd(70, " "),
      ],
    );

    expect(result.skillGaps.find((gap) => gap.skill === "React.js")).toMatchObject({
      missingIn: 2,
      jobTitles: ["Frontend Engineer", "Backend Engineer"],
    });
    expect(result.skillGaps.filter((gap) =>
      ["React.js", "React"].includes(gap.skill),
    )).toHaveLength(1);
  });
});
