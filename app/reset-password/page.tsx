import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/PasswordForms";

export const metadata: Metadata = {
  title: "Choose a new password",
};

export default function Page() {
  return (
    <AuthShell
      title="Choose a new password"
      description="Pick a password you haven't used here before."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
