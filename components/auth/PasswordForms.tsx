"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AuthField,
  EMAIL_PATTERN,
  FormError,
  MIN_PASSWORD_LENGTH,
  NOT_CONFIGURED_ERROR,
  SUBMIT_CLASS,
  friendlyAuthError,
} from "@/components/auth/AuthForm";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldError = !email.trim()
      ? "Enter your email."
      : EMAIL_PATTERN.test(email.trim()) ? undefined : "Enter a valid email address.";
    setError(fieldError);
    setFormError(undefined);
    if (fieldError) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFormError(NOT_CONFIGURED_ERROR);
      return;
    }
    setIsSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    setIsSubmitting(false);
    if (resetError) {
      setFormError(friendlyAuthError(resetError.message));
      return;
    }
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div role="status" className="grid gap-3 rounded-2xl bg-indigo-50 p-6 text-indigo-950 ring-1 ring-indigo-200">
        <p className="text-lg font-semibold">Check your email</p>
        <p>
          If an account exists for <span className="font-semibold">{sentTo}</span>, we sent a link to
          choose a new password. Open it on this device.
        </p>
        <Link href="/login" className="font-semibold text-indigo-800 underline underline-offset-2">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-5">
      <AuthField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={error}
      />
      <FormError message={formError} />
      <button type="submit" disabled={isSubmitting} className={SUBMIT_CLASS}>
        {isSubmitting ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = {
      password:
        password.length >= MIN_PASSWORD_LENGTH
          ? undefined
          : `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      confirm: confirm === password ? undefined : "The passwords don't match.",
    };
    setErrors(fieldErrors);
    setFormError(undefined);
    if (fieldErrors.password || fieldErrors.confirm) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFormError(NOT_CONFIGURED_ERROR);
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFormError(friendlyAuthError(error.message));
      setIsSubmitting(false);
      return;
    }
    router.replace("/home");
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-5">
      <AuthField
        label="New password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      />
      <AuthField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        error={errors.confirm}
      />
      <FormError message={formError} />
      <button type="submit" disabled={isSubmitting} className={SUBMIT_CLASS}>
        {isSubmitting ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
