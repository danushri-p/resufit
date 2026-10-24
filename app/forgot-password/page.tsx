import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/PasswordForms";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function Page() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we'll send you a link to choose a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-indigo-700 hover:underline">
            Back to log in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
