"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-20 text-center">
      <h1 className="text-3xl font-semibold text-stone-900">
        Something went wrong.
      </h1>
      <p className="max-w-md text-stone-700">
        ResuFit couldn&apos;t load this page. Please try again.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={retry}>
          Try again
        </Button>
        <Link
          href="/"
          className="inline-flex min-h-9 items-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-900 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
