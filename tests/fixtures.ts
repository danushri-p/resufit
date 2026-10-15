import type { JobRequirements, Resume } from "@/lib/schemas";

export function makeResume(overrides: Partial<Resume> = {}): Resume {
  return {
    name: "Taylor Example",
    email: "taylor@example.com",
    summary: null,
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    ...overrides,
  };
}

export function makeJob(
  overrides: Partial<JobRequirements> = {},
): JobRequirements {
  return {
    jobTitle: "Software Engineer",
    company: "Example Co",
    mustHaveSkills: [],
    niceToHaveSkills: [],
    yearsOfExperience: null,
    responsibilities: [],
    keywords: [],
    ...overrides,
  };
}
