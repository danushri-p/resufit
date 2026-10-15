import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateStructured } from "@/lib/ai/client";
import { extractResume } from "@/lib/ai/extractResume";
import { makeResume } from "@/tests/fixtures";

vi.mock("@/lib/ai/client", () => ({
  cleanSkillArray: (skills: string[]) => skills,
  generateStructured: vi.fn(),
}));

describe("extractResume", () => {
  beforeEach(() => {
    vi.mocked(generateStructured).mockReset();
  });

  it("restores the full source line for a truncated project bullet", async () => {
    vi.mocked(generateStructured).mockImplementation(async () =>
      makeResume({
        experience: [
          {
            role: "Frontend Developer",
            company: "Acme Corp",
            startDate: null,
            endDate: null,
            bullets: ["Integrated Google Calendar with automated checks"],
          },
        ],
        projects: [
          {
            name: "Calendar",
            description: null,
            techStack: [],
            bullets: ["Integrated Google Calendar with automated checks"],
          },
        ],
      }) as never,
    );

    const resume = await extractResume(
      "Frontend Developer, Acme Corp\nCalendar project\n• Integrated Google Calendar with automated checks every 5 minutes",
    );

    expect(resume.projects[0].bullets).toEqual([
      "Integrated Google Calendar with automated checks every 5 minutes",
    ]);
    expect(resume.experience[0].bullets).toEqual([
      "Integrated Google Calendar with automated checks every 5 minutes",
    ]);
  });

  it("drops experience not named in the resume and keeps a real role or company", async () => {
    vi.mocked(generateStructured).mockResolvedValue(
      makeResume({
        experience: [
          {
            role: "Full-stack Intern",
            company: "Example Company",
            startDate: null,
            endDate: null,
            bullets: ["Built a web application"],
          },
          {
            role: "Frontend Developer",
            company: "Acme Corp",
            startDate: null,
            endDate: null,
            bullets: ["Built a web application"],
          },
        ],
      }),
    );

    const resume = await extractResume(
      "Looking for a full-stack internship. Frontend   Developer, Acme Corp",
    );

    expect(resume.experience).toHaveLength(1);
    expect(resume.experience[0]).toMatchObject({
      role: "Frontend Developer",
      company: "Acme Corp",
    });
  });
});
