import { normalizeSkill } from "@/lib/matching/skills";

export type PracticeKind =
  | "typing"
  | "testing"
  | "database"
  | "docker"
  | "ci"
  | "kubernetes"
  | "infrastructure"
  | "cloud"
  | "frontend"
  | "accessibility"
  | "backend"
  | "auth"
  | "ai"
  | "language"
  | "tooling"
  | "data";

interface LearningResource {
  /** Display name of the skill. */
  name: string;
  /** Other spellings that should resolve to this resource. */
  aliases?: string[];
  docs: { title: string; url: string };
  kind: PracticeKind;
}

// Official documentation only. Every URL was checked to load before it was added;
// rerun the link check in the README when editing this list.
const RESOURCES: LearningResource[] = [
  { name: "TypeScript", docs: { title: "TypeScript documentation", url: "https://www.typescriptlang.org/docs/" }, kind: "typing" },
  { name: "JavaScript", docs: { title: "MDN JavaScript guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" }, kind: "language" },
  { name: "React", docs: { title: "Learn React", url: "https://react.dev/learn" }, kind: "frontend" },
  { name: "Next.js", docs: { title: "Learn Next.js", url: "https://nextjs.org/learn" }, kind: "frontend" },
  { name: "Vue", aliases: ["Vue.js"], docs: { title: "Vue guide", url: "https://vuejs.org/guide/introduction.html" }, kind: "frontend" },
  { name: "Angular", docs: { title: "Angular tutorials", url: "https://angular.dev/tutorials" }, kind: "frontend" },
  { name: "React Native", docs: { title: "React Native: getting started", url: "https://reactnative.dev/docs/getting-started" }, kind: "frontend" },
  { name: "Flutter", docs: { title: "Flutter: get started", url: "https://docs.flutter.dev/get-started" }, kind: "frontend" },
  { name: "HTML", docs: { title: "MDN HTML reference", url: "https://developer.mozilla.org/en-US/docs/Web/HTML" }, kind: "frontend" },
  { name: "CSS", docs: { title: "MDN CSS reference", url: "https://developer.mozilla.org/en-US/docs/Web/CSS" }, kind: "frontend" },
  { name: "Tailwind CSS", aliases: ["Tailwind"], docs: { title: "Tailwind CSS documentation", url: "https://tailwindcss.com/docs" }, kind: "frontend" },
  { name: "Accessibility", aliases: ["a11y", "WCAG"], docs: { title: "W3C introduction to web accessibility", url: "https://www.w3.org/WAI/fundamentals/accessibility-intro/" }, kind: "accessibility" },
  { name: "Node.js", docs: { title: "Learn Node.js", url: "https://nodejs.org/en/learn" }, kind: "backend" },
  { name: "Express", aliases: ["Express.js"], docs: { title: "Express: getting started", url: "https://expressjs.com/en/starter/installing.html" }, kind: "backend" },
  { name: "Django", docs: { title: "Django tutorial", url: "https://docs.djangoproject.com/en/stable/intro/tutorial01/" }, kind: "backend" },
  { name: "Flask", docs: { title: "Flask quickstart", url: "https://flask.palletsprojects.com/en/stable/quickstart/" }, kind: "backend" },
  { name: "FastAPI", docs: { title: "FastAPI tutorial", url: "https://fastapi.tiangolo.com/tutorial/" }, kind: "backend" },
  { name: "Spring", aliases: ["Spring Boot"], docs: { title: "Spring guides", url: "https://spring.io/guides" }, kind: "backend" },
  { name: "GraphQL", docs: { title: "Learn GraphQL", url: "https://graphql.org/learn/" }, kind: "backend" },
  { name: "REST APIs", aliases: ["REST API", "REST", "REST API design", "HTTP"], docs: { title: "MDN HTTP guide", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP" }, kind: "backend" },
  { name: "WebSockets", aliases: ["WebSocket", "Socket.IO", "real-time features"], docs: { title: "MDN WebSockets API", url: "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API" }, kind: "backend" },
  { name: "OAuth", aliases: ["OAuth 2.0"], docs: { title: "OAuth 2.0", url: "https://oauth.net/2/" }, kind: "auth" },
  { name: "JWT", aliases: ["JSON Web Tokens"], docs: { title: "Introduction to JSON Web Tokens", url: "https://jwt.io/introduction" }, kind: "auth" },
  { name: "PostgreSQL", aliases: ["Postgres"], docs: { title: "PostgreSQL tutorial", url: "https://www.postgresql.org/docs/current/tutorial.html" }, kind: "database" },
  { name: "SQL", docs: { title: "PostgreSQL tutorial (SQL basics)", url: "https://www.postgresql.org/docs/current/tutorial.html" }, kind: "database" },
  { name: "MongoDB", docs: { title: "MongoDB manual", url: "https://www.mongodb.com/docs/manual/" }, kind: "database" },
  { name: "Redis", docs: { title: "Redis documentation", url: "https://redis.io/docs/latest/" }, kind: "database" },
  { name: "Prisma", docs: { title: "Prisma: getting started", url: "https://www.prisma.io/docs/getting-started" }, kind: "database" },
  { name: "Firebase", docs: { title: "Firebase documentation", url: "https://firebase.google.com/docs" }, kind: "cloud" },
  { name: "Unit testing", aliases: ["Testing", "Unit tests", "Automated testing"], docs: { title: "Vitest guide", url: "https://vitest.dev/guide/" }, kind: "testing" },
  { name: "Jest", docs: { title: "Jest: getting started", url: "https://jestjs.io/docs/getting-started" }, kind: "testing" },
  { name: "Vitest", docs: { title: "Vitest guide", url: "https://vitest.dev/guide/" }, kind: "testing" },
  { name: "Playwright", aliases: ["End-to-end testing", "E2E testing"], docs: { title: "Playwright: getting started", url: "https://playwright.dev/docs/intro" }, kind: "testing" },
  { name: "Docker", docs: { title: "Docker: get started", url: "https://docs.docker.com/get-started/" }, kind: "docker" },
  { name: "Kubernetes", aliases: ["K8s"], docs: { title: "Kubernetes basics", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/" }, kind: "kubernetes" },
  { name: "GitHub Actions", aliases: ["CI/CD", "CI", "Continuous integration", "basic CI/CD"], docs: { title: "GitHub Actions documentation", url: "https://docs.github.com/en/actions" }, kind: "ci" },
  { name: "Terraform", aliases: ["Infrastructure as code"], docs: { title: "Terraform tutorials", url: "https://developer.hashicorp.com/terraform/tutorials" }, kind: "infrastructure" },
  { name: "AWS", aliases: ["Amazon Web Services", "cloud platform"], docs: { title: "AWS getting started", url: "https://aws.amazon.com/getting-started/" }, kind: "cloud" },
  { name: "Azure", aliases: ["Microsoft Azure"], docs: { title: "Azure training", url: "https://learn.microsoft.com/en-us/training/azure/" }, kind: "cloud" },
  { name: "Google Cloud", aliases: ["GCP", "Google Cloud Platform"], docs: { title: "Google Cloud: get started", url: "https://cloud.google.com/docs/get-started" }, kind: "cloud" },
  { name: "Git", docs: { title: "Pro Git book", url: "https://git-scm.com/book/en/v2" }, kind: "tooling" },
  { name: "Linux", aliases: ["Command line", "Bash"], docs: { title: "Command line for beginners", url: "https://ubuntu.com/tutorials/command-line-for-beginners" }, kind: "tooling" },
  { name: "Figma", docs: { title: "Figma help center", url: "https://help.figma.com/hc/en-us" }, kind: "tooling" },
  { name: "Python", docs: { title: "Python tutorial", url: "https://docs.python.org/3/tutorial/" }, kind: "language" },
  { name: "Java", docs: { title: "Learn Java", url: "https://dev.java/learn/" }, kind: "language" },
  { name: "C#", docs: { title: "C# documentation", url: "https://learn.microsoft.com/en-us/dotnet/csharp/" }, kind: "language" },
  { name: "Go", aliases: ["Golang"], docs: { title: "Learn Go", url: "https://go.dev/learn/" }, kind: "language" },
  { name: "Rust", docs: { title: "The Rust Programming Language", url: "https://doc.rust-lang.org/book/" }, kind: "language" },
  { name: "pandas", docs: { title: "pandas: getting started", url: "https://pandas.pydata.org/docs/getting_started/index.html" }, kind: "data" },
  { name: "scikit-learn", aliases: ["Machine learning"], docs: { title: "scikit-learn: getting started", url: "https://scikit-learn.org/stable/getting_started.html" }, kind: "data" },
  { name: "OpenAI", aliases: ["OpenAI API"], docs: { title: "OpenAI API quickstart", url: "https://platform.openai.com/docs/quickstart" }, kind: "ai" },
  { name: "Gemini", aliases: ["Gemini API", "LLM APIs", "LLM", "AI features", "LLM-based features"], docs: { title: "Gemini API documentation", url: "https://ai.google.dev/gemini-api/docs" }, kind: "ai" },
];

const BY_KEY = new Map<string, LearningResource>();
for (const resource of RESOURCES) {
  for (const label of [resource.name, ...(resource.aliases ?? [])]) {
    const key = normalizeSkill(label);
    if (key && !BY_KEY.has(key)) BY_KEY.set(key, resource);
  }
}

export interface ResolvedResource {
  title: string;
  url: string;
  /** False when no curated official page exists and the link is a web search. */
  official: boolean;
  kind: PracticeKind | null;
}

export function findLearningResource(skill: string): ResolvedResource {
  const resource = BY_KEY.get(normalizeSkill(skill));
  if (resource) {
    return { ...resource.docs, official: true, kind: resource.kind };
  }
  return {
    title: `Search for the official ${skill} documentation`,
    url: `https://duckduckgo.com/?q=${encodeURIComponent(`${skill} official documentation`)}`,
    official: false,
    kind: null,
  };
}

/** All curated URLs, used by the link check test. */
export function curatedResourceUrls(): string[] {
  return [...new Set(RESOURCES.map((resource) => resource.docs.url))];
}

export function practiceIdea(skill: string, kind: PracticeKind | null, project: string | null): string {
  const target = project ?? "a small practice project";
  switch (kind) {
    case "typing":
      return `Convert one part of ${target} to ${skill} and fix the type errors it finds.`;
    case "testing":
      return `Write ${skill === "Unit testing" ? "unit tests" : `${skill} tests`} for the most important feature of ${target}.`;
    case "database":
      return `Store part of ${target}'s data in ${skill} and write the main queries yourself.`;
    case "docker":
      return `Write a Dockerfile that runs ${target} locally with one command.`;
    case "ci":
      return `Add a GitHub Actions workflow that runs ${target}'s tests on every push.`;
    case "kubernetes":
      return `Deploy ${target} as a container to a local Kubernetes cluster.`;
    case "infrastructure":
      return `Describe one cloud resource ${target} needs in ${skill} and apply it.`;
    case "cloud":
      return `Deploy ${target}, or one part of it, on ${skill}'s free tier.`;
    case "frontend":
      return `Rebuild one page of ${target} with ${skill}.`;
    case "accessibility":
      return `Test ${target} with a keyboard and a screen reader, and fix what you find.`;
    case "backend":
      return `Add a small ${skill} feature to ${target}, such as one new endpoint.`;
    case "auth":
      return `Add sign-in with ${skill} to ${target}.`;
    case "ai":
      return `Add one AI-assisted feature to ${target} using the ${skill} API's free tier.`;
    case "language":
      return `Rewrite a small utility from ${target} in ${skill}.`;
    case "tooling":
      return `Use ${skill} throughout your next change to ${target}.`;
    case "data":
      return `Analyze a small dataset related to ${target} with ${skill}.`;
    default:
      return `Build a small feature in ${target} that uses ${skill}.`;
  }
}
