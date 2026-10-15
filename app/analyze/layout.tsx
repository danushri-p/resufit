import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Analyze your resume",
};

export default function AnalyzeLayout({ children }: { children: ReactNode }) {
  return children;
}
