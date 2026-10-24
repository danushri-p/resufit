import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  ArrowDown,
  BriefcaseBusiness,
  CircleCheck,
  ClipboardList,
  Columns3,
  FileText,
  GraduationCap,
  Mail,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { MatchDemo } from "@/components/landing/MatchDemo";
import { LandingAuthLinks } from "@/components/landing/LandingAuthLinks";

export const metadata: Metadata = {
  title: { absolute: "ResuFit – AI resume analyzer" },
};

type Float = { className: string; tilt?: number; delay?: number };

const ICON_TILES: (Float & { icon: LucideIcon; color: string })[] = [
  { icon: FileText, color: "text-indigo-600", className: "left-[4%] top-[6%]" },
  { icon: Mail, color: "text-amber-600", className: "left-[40%] top-[4%]", delay: 1.2 },
  { icon: Target, color: "text-indigo-600", className: "left-[16%] top-[24%]", delay: 2.1 },
  { icon: Sparkles, color: "text-indigo-600", className: "left-[42%] top-[44%]", delay: 0.6 },
  { icon: CircleCheck, color: "text-green-600", className: "left-[3%] top-[52%]", delay: 1.7 },
  { icon: BriefcaseBusiness, color: "text-green-700", className: "left-[14%] top-[70%]", delay: 2.6 },
  { icon: PenLine, color: "text-indigo-600", className: "left-[40%] top-[78%]", delay: 0.9 },
  { icon: GraduationCap, color: "text-indigo-600", className: "left-[54%] top-[8%]", delay: 1.5 },
  { icon: ClipboardList, color: "text-cyan-700", className: "right-[3%] top-[34%]", delay: 0.3 },
  { icon: Mail, color: "text-indigo-600", className: "left-[53%] top-[60%]", delay: 2.3 },
  { icon: Target, color: "text-green-600", className: "right-[18%] top-[80%]", delay: 1.1 },
];

const CHIPS: (Float & { label: string; dot: string; tone: string })[] = [
  { label: "Docker — To learn", dot: "bg-amber-500", tone: "bg-amber-50 ring-amber-200", className: "left-[2%] top-[34%]", tilt: -2 },
  { label: "React — Matched", dot: "bg-green-500", tone: "bg-white ring-stone-200", className: "left-[2%] top-[76%]", delay: 1.4 },
  { label: "Invented metric — Blocked", dot: "bg-red-500", tone: "bg-red-50 ring-red-200", className: "left-[14%] top-[88%]", tilt: 2, delay: 0.8 },
  { label: "Bullet rewritten", dot: "bg-indigo-500", tone: "bg-white ring-indigo-200", className: "right-[4%] top-[8%]", tilt: -1, delay: 2 },
  { label: "ATS check — 88/100", dot: "bg-cyan-500", tone: "bg-white ring-stone-200", className: "left-[52%] top-[90%]", delay: 0.4 },
  { label: "Cover letter — Ready", dot: "bg-green-500", tone: "bg-green-50 ring-green-200", className: "right-[6%] top-[88%]", delay: 1.8 },
  { label: "TypeScript — Matched", dot: "bg-green-500", tone: "bg-white ring-stone-200", className: "right-[22%] top-[16%]", tilt: 1, delay: 2.4 },
];

function floatStyle({ tilt = 0, delay = 0 }: Float): CSSProperties {
  return { "--tilt": `${tilt}deg`, transform: `rotate(${tilt}deg)`, animationDelay: `${delay}s` } as CSSProperties;
}

const STEPS = [
  { icon: Upload, title: "Upload your resume", detail: "PDF or DOCX. We read your skills, projects and experience." },
  { icon: FileText, title: "Paste the job", detail: "ResuFit pulls out the must-have and nice-to-have skills." },
  { icon: Target, title: "Get an honest fit", detail: "A match score, what's missing, and better wording for what's true." },
];

const FEATURES: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: Target, title: "Match score & ATS check", detail: "Rule-based and repeatable, so you can see exactly why you scored what you did." },
  { icon: PenLine, title: "Honest bullet rewrites", detail: "Accept or reject each rewrite. Numbers, skills and tools are checked against your resume." },
  { icon: FileText, title: "Tailored resume PDF", detail: "A clean one-column resume for each job, ready for applicant tracking systems." },
  { icon: Mail, title: "Cover letter & interview prep", detail: "Grounded in your real projects, with practice mode for answers." },
  { icon: Columns3, title: "Compare jobs", detail: "Rank one resume against up to three roles and find the skills that unlock most." },
  { icon: GraduationCap, title: "Learning plan & tracker", detail: "Official docs for every gap, plus a tracker for applications and follow-ups." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col bg-stone-50">
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link
            href="/"
            aria-label="ResuFit home"
            className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <Logo size={30} />
          </Link>
          <nav aria-label="Account" className="flex flex-row-reverse flex-wrap items-center gap-2 sm:gap-3">
            <LandingAuthLinks />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden bg-linear-to-br from-indigo-50/60 via-stone-50 to-cyan-50/60">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
            <div className="absolute inset-y-0 left-1/2 hidden w-px bg-stone-200 lg:block" />
            {ICON_TILES.map(({ icon: Icon, color, ...float }, index) => (
              <span
                key={index}
                style={floatStyle(float)}
                className={`absolute inline-flex size-13 items-center justify-center rounded-2xl bg-white shadow-lg shadow-indigo-100 ring-1 ring-stone-200 motion-safe:animate-float ${float.className}`}
              >
                <Icon className={`size-6 ${color}`} />
              </span>
            ))}
            {CHIPS.map(({ label, dot, tone, ...float }) => (
              <span
                key={label}
                style={floatStyle(float)}
                className={`absolute hidden items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-stone-700 shadow-md ring-1 motion-safe:animate-float lg:inline-flex ${tone} ${float.className}`}
              >
                <span className={`size-2 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>

          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2">
            <div className="flex flex-col items-center text-center">
              <span className="inline-flex size-20 items-center justify-center rounded-3xl bg-white shadow-xl shadow-indigo-200/60 ring-1 ring-stone-200">
                <Logo size={56} iconOnly />
              </span>
              <h1 className="mt-6 font-display text-7xl leading-none tracking-tight text-stone-900 sm:text-8xl">
                Resu
                <span className="bg-linear-to-r from-indigo-600 to-cyan-600 bg-clip-text pr-2 italic text-transparent">
                  Fit
                </span>
              </h1>
              <p className="mt-5 text-xl font-semibold text-stone-900">
                Not every job wants the same resume.
              </p>
              <p className="mt-3 max-w-md leading-7 text-stone-600">
                Paste a job description and see exactly where your resume fits, what&apos;s
                missing, and how to say it better, without inventing a single thing.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LandingAuthLinks size="large" />
              </div>
              <a
                href="#how-it-works"
                className="mt-12 inline-flex flex-col items-center gap-2 rounded-lg text-xs font-semibold uppercase tracking-[0.2em] text-stone-600 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Scroll to explore
                <span className="inline-flex size-8 items-center justify-center rounded-full ring-1 ring-stone-300 motion-safe:animate-bounce">
                  <ArrowDown aria-hidden="true" className="size-4" />
                </span>
              </a>
            </div>

            <div className="flex justify-center">
              <MatchDemo />
            </div>
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 px-4 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">How it works</p>
            <h2 id="how-heading" className="mt-3 text-center font-display text-5xl text-stone-900">
              Three steps to a better fit
            </h2>
            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, detail }, index) => (
                <li key={title} className="relative rounded-3xl bg-white p-7 ring-1 ring-stone-200">
                  <span className="absolute right-6 top-5 font-display text-5xl text-indigo-100">
                    {index + 1}
                  </span>
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-stone-900">{title}</h3>
                  <p className="mt-2 leading-7 text-stone-600">{detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="px-4 pb-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">Features</p>
            <h2 id="features-heading" className="mt-3 text-center font-display text-5xl text-stone-900">
              Everything for the application
            </h2>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, detail }) => (
                <li key={title} className="rounded-3xl bg-white p-7 ring-1 ring-stone-200 transition-shadow hover:shadow-lg">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-50 to-cyan-50 text-indigo-700">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 font-bold text-stone-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="honest-heading" className="px-4 pb-20 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl bg-sidebar p-8 text-sidebar-foreground sm:p-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <ShieldCheck aria-hidden="true" className="size-10 text-[#67E8F9]" />
              <h2 id="honest-heading" className="mt-4 font-display text-5xl text-sidebar-accent-foreground">
                Honest by design
              </h2>
              <p className="mt-3 leading-7">
                AI tools love to invent metrics and skills. ResuFit checks every generated sentence
                against your resume before you see it.
              </p>
            </div>
            <ul className="grid gap-3">
              {[
                "Numbers that aren't in your resume are rejected.",
                "Skills you're missing are never claimed.",
                "Rewrites only use tools already in that project.",
                "Your history and tracker stay in your browser.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-2xl bg-sidebar-accent px-4 py-3 text-sidebar-accent-foreground">
                  <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#86EFAC]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="cta-heading" className="px-4 pb-16 text-center sm:px-8">
          <h2 id="cta-heading" className="font-display text-5xl text-stone-900 sm:text-6xl">
            Your next application,{" "}
            <span className="italic text-indigo-700">fitted.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-stone-600">
            Free to use. Create an account in seconds and analyze your first resume.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <LandingAuthLinks size="large" />
          </div>
        </section>
      </main>
    </div>
  );
}
