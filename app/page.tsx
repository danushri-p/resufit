import Image from "next/image";
import Link from "next/link";
import { ProviderFooter } from "@/components/ProviderFooter";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-stone-50 px-6 py-10 text-center">
      <Image
        src="/resufit-logo.svg"
        alt="ResuFit"
        width={184}
        height={48}
        priority
      />
      <Link
        href="/history"
        className="absolute right-6 top-6 rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
      >
        History
      </Link>
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
          Make your next move count.
        </h1>
        <p className="text-lg text-stone-600">
          Get a clearer picture of how your resume fits the role.
        </p>
      </div>
      <Link
        href="/analyze"
        className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition-colors hover:bg-indigo-700"
      >
        Try it
      </Link>
      <ProviderFooter />
    </main>
  );
}
