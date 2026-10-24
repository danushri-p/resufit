import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { PAGE_CLASS } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Analyze your resume",
};

export default function AnalyzeLayout({ children }: { children: ReactNode }) {
  // The page reads ?view= with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense
      fallback={
        <main className={PAGE_CLASS}>
          <p className="text-sm text-stone-600" role="status">Loading…</p>
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
