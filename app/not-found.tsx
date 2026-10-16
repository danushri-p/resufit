import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-stone-50 px-4 text-center">
      <header className="absolute left-4 top-6">
        <Link href="/" aria-label="ResuFit" className="inline-flex">
          <Logo />
        </Link>
      </header>
      <p className="text-sm font-semibold uppercase tracking-wider text-indigo-800">
        404 · Not found
      </p>
      <h1 className="text-3xl font-semibold text-stone-900">
        We couldn&apos;t find that page.
      </h1>
      <p className="max-w-md text-stone-700">
        The link may be out of date, or the page may have moved.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-indigo-700 px-4 py-3 font-medium text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
        >
          Go home
        </Link>
        <Link
          href="/analyze"
          className="rounded-lg border border-stone-300 bg-white px-4 py-3 font-medium text-stone-900 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
        >
          Analyze a resume
        </Link>
      </div>
    </main>
  );
}
