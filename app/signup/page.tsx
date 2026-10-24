import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function Page() {
  return (
    <AuthShell
      title="Create your account"
      description="Free to use. Start fitting your resume to every job."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
