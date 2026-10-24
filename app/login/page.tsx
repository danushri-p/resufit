import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log in",
};

export default function Page() {
  return (
    <AuthShell
      title="Welcome back"
      description="Log in to analyze resumes and pick up where you left off."
      footer={
        <>
          New to ResuFit?{" "}
          <Link href="/signup" className="font-semibold text-indigo-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
