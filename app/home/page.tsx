import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  ClipboardPaste,
  Ellipsis,
  FileDown,
  FileText,
  Gauge,
  PenLine,
  Sparkles,
  Target,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Greeting } from "@/components/Greeting";
import { HeroIllustration } from "@/components/HeroIllustration";
import { PAGE_CLASS } from "@/components/PageHeader";
import { getProviderLabel } from "@/components/ProviderFooter";

export const metadata: Metadata = {
  title: "Home",
};

const HIGHLIGHTS: { label: string; icon: LucideIcon; color: string }[] = [
  { label: "Match score", icon: Target, color: "bg-cyan-100 text-cyan-800" },
  { label: "Missing skills", icon: CircleAlert, color: "bg-amber-100 text-amber-800" },
  { label: "Rewritten bullets", icon: PenLine, color: "bg-indigo-100 text-indigo-800" },
  { label: "Tailored resume", icon: FileText, color: "bg-green-100 text-green-800" },
];

const FEATURES: { title: string; detail: string; href: string; icon: LucideIcon }[] = [
  { title: "Match score", detail: "See how well you fit", href: "/analyze", icon: Gauge },
  { title: "Missing skills", detail: "Know what to learn next", href: "/learn", icon: CircleAlert },
  { title: "Bullet rewrites", detail: "Stronger, honest wording", href: "/analyze", icon: PenLine },
  { title: "Tailored PDF", detail: "A job-specific resume", href: "/resume", icon: FileDown },
  {
    title: "More features",
    detail: "Cover letter, interview prep, tracker",
    href: "/tracker",
    icon: Ellipsis,
  },
];

const STEPS: { title: string; detail: string; icon: LucideIcon }[] = [
  { title: "Upload resume", detail: "PDF or DOCX", icon: Upload },
  { title: "Add job description", detail: "Paste the posting", icon: ClipboardPaste },
  { title: "Get match score", detail: "Skills, ATS check and insights", icon: BadgeCheck },
  { title: "Improve and download", detail: "Tailored resume and cover letter", icon: Sparkles },
];

const PRIMARY_LINK =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2";
const SECONDARY_LINK =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-5 py-2.5 font-semibold text-stone-900 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2";

export default function HomePage() {
  const isGeminiProvider = getProviderLabel().trim().toLowerCase() === "gemini";

  return (
    <main className={PAGE_CLASS}>
      <section className="relative grid items-center gap-8 overflow-hidden rounded-2xl bg-linear-to-br from-white via-white to-indigo-50 p-6 ring-1 ring-stone-200 sm:p-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative space-y-5">
          <Greeting />
          <h1 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl">
            Your next opportunity starts with a{" "}
            <span className="text-indigo-700">better resume.</span>
          </h1>
          <p className="max-w-lg leading-7 text-stone-600">
            Upload your resume and a job description to get a match score, missing skills,
            honest bullet rewrites and a tailored resume, without inventing experience.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/analyze" className={PRIMARY_LINK}>
              <Upload aria-hidden="true" className="size-4" />
              Analyze your resume
            </Link>
            <Link href="/analyze?sample=1" className={SECONDARY_LINK}>
              Try a sample
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
        <div className="relative flex flex-col items-center gap-4 sm:flex-row lg:justify-end">
          <HeroIllustration className="w-full max-w-72" />
          <ul aria-label="What you get" className="grid w-full gap-2 sm:w-auto">
            {HIGHLIGHTS.map(({ label, icon: Icon, color }) => (
              <li
                key={label}
                className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-stone-800 shadow-sm ring-1 ring-stone-200"
              >
                <span className={`inline-flex size-7 items-center justify-center rounded-lg ${color}`}>
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="features" className="grid gap-4">
        <h2 id="features" className="text-lg font-bold text-stone-900">
          Everything you need to get hired
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map(({ title, detail, href, icon: Icon }) => (
            <li key={title}>
              <Link
                href={href}
                className="flex h-full flex-col gap-3 rounded-xl bg-white p-5 ring-1 ring-stone-200 transition-shadow hover:shadow-md hover:ring-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="font-semibold text-stone-900">{title}</span>
                <span className="text-sm text-stone-600">{detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-it-works" className="grid gap-4 rounded-2xl bg-white p-6 ring-1 ring-stone-200">
        <h2 id="how-it-works" className="text-lg font-bold text-stone-900">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ title, detail, icon: Icon }, index) => (
            <li key={title} className="flex items-center gap-3 lg:flex-col lg:text-center">
              <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <div>
                <h3 className="font-semibold text-stone-900">
                  {index + 1}. {title}
                </h3>
                <p className="text-sm text-stone-600">{detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
        <h2 className="font-semibold">Your privacy</h2>
        <p className="mt-1">
          Your resume is sent to the AI provider to generate the analysis and is not stored by
          ResuFit.{" "}
          {isGeminiProvider &&
            "On the live site the provider is Google Gemini; on the free tier Google may use submitted content to improve its products, so avoid uploading information you don't want to share. "}
          Saved history and tracked applications stay in this browser.{" "}
          <Link
            href="/data"
            className="font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
          >
            Back up or delete your data
          </Link>
          .
        </p>
      </aside>
    </main>
  );
}
