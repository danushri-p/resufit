"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useUser } from "@/lib/auth/useUser";

export const PRIMARY_CTA =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 font-semibold text-white shadow-lg shadow-indigo-300/40 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2";
export const SECONDARY_CTA =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-5 py-2.5 font-semibold text-stone-900 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2";

/** "Log in" and "Get started free", or "Open ResuFit" for someone already signed in. */
export function LandingAuthLinks({ size = "default" }: { size?: "default" | "large" }) {
  const { user } = useUser();
  const large = size === "large" ? "min-h-13 px-7 text-lg" : "";

  if (user) {
    return (
      <Link href="/home" className={`${PRIMARY_CTA} ${large}`}>
        Open ResuFit
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    );
  }
  return (
    <>
      <Link href="/signup" className={`${PRIMARY_CTA} ${large}`}>
        Get started free
      </Link>
      <Link href="/login" className={`${SECONDARY_CTA} ${large}`}>
        Log in
      </Link>
    </>
  );
}
