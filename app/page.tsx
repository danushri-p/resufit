import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getProviderLabel, ProviderFooter } from "@/components/ProviderFooter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "ResuFit – AI resume analyzer" },
};

export default function Home() {
  const isGeminiProvider =
    getProviderLabel().trim().toLowerCase() === "gemini";

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="ResuFit" className="min-w-0">
            <Logo />
          </Link>
          <Link
            href="/history"
            className="rounded-md px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
          >
            History
          </Link>
        </header>

        <section className="grid gap-6">
          <Logo size={56} />
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Make your next move count.
          </h1>
          <p className="max-w-2xl text-lg leading-7 text-stone-700">
            ResuFit compares your resume with a job and helps you strengthen your
            application without inventing experience.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/analyze"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-700 px-5 py-3 font-medium text-white transition-colors hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
            >
              Analyze your resume
            </Link>
            <Link
              href="/analyze?sample=1"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-3 font-medium text-stone-900 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
            >
              Try a sample
            </Link>
          </div>
        </section>

        <section aria-labelledby="how-it-works" className="grid gap-5">
          <h2 id="how-it-works" className="text-2xl font-semibold">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              ["1. Upload", "Add a PDF or DOCX resume, or try the sample."],
              ["2. Paste job", "Share the job description you are targeting."],
              ["3. Get results", "Review your score, suggestions, and rewrites."],
            ].map(([title, detail]) => (
              <li key={title} className="rounded-xl bg-white p-5 ring-1 ring-stone-200">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-700">{detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="features" className="grid gap-5">
          <h2 id="features" className="text-2xl font-semibold">
            Practical feedback, with honesty checks
          </h2>
          <ul className="grid gap-3 text-stone-800 sm:grid-cols-2">
            {[
              "Resume-to-job match score",
              "Suggestions that avoid unsupported claims",
              "Bullet rewrites checked against your original facts",
              "Deterministic ATS checks",
              "Downloadable Markdown report",
              "History stored only in your browser",
            ].map((feature) => (
              <li key={feature} className="rounded-lg bg-white p-4 ring-1 ring-stone-200">
                {feature}
              </li>
            ))}
          </ul>
        </section>

        <aside className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
          <h2 className="font-semibold">Your privacy</h2>
          <p className="mt-1">
            Your resume is sent to the AI provider to generate the analysis and
            is not stored by ResuFit.{" "}
            {isGeminiProvider &&
              "On the live site the provider is Google Gemini; on the free tier Google may use submitted content to improve its products, so avoid uploading information you don't want to share. "}
            Saved history stays in this browser.
          </p>
        </aside>

        <ProviderFooter />
      </div>
    </main>
  );
}
