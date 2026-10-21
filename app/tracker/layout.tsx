import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Application tracker",
};

export default function TrackerLayout({ children }: { children: ReactNode }) {
  return children;
}
