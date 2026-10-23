import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Learning plan",
};

export default function LearnLayout({ children }: { children: ReactNode }) {
  return children;
}
