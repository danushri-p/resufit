import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Offline",
};

const LINK =
  "inline-flex rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-stone-50 px-4 text-center">
      <Logo size={48} />
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
        You&apos;re offline
      </h1>
      <p className="max-w-md text-stone-700">
        This page isn&apos;t saved for offline use. Your application tracker and analysis
        history are stored in this browser, so they still work without a connection.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <a href="/tracker" className={`${LINK} bg-indigo-700 text-white hover:bg-indigo-800`}>
          Open tracker
        </a>
        <a href="/history" className={`${LINK} text-indigo-800 ring-1 ring-indigo-200 hover:bg-indigo-50`}>
          Open history
        </a>
        <Link href="/" className={`${LINK} text-indigo-800 ring-1 ring-indigo-200 hover:bg-indigo-50`}>
          Try again
        </Link>
      </div>
    </main>
  );
}
