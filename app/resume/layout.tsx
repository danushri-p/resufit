import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tailored resume",
};

export default function ResumeLayout({ children }: { children: ReactNode }) {
  return children;
}
