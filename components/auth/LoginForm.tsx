"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  AuthField,
  EMAIL_PATTERN,
  FormError,
  GoogleButton,
  NOT_CONFIGURED_ERROR,
  SUBMIT_CLASS,
  friendlyAuthError,
} from "@/components/auth/AuthForm";
import { safeNextPath } from "@/lib/auth/routes";
import { isGoogleSignInEnabled } from "@/lib/supabase/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | undefined>(
    searchParams.get("error") === "link"
      ? "That link has expired or was already used. Please try again."
      : undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = {
      email: !email.trim()
        ? "Enter your email."
        : EMAIL_PATTERN.test(email.trim()) ? undefined : "Enter a valid email address.",
      password: password ? undefined : "Enter your password.",
    };
    setErrors(fieldErrors);
    setFormError(undefined);
    if (fieldErrors.email || fieldErrors.password) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFormError(NOT_CONFIGURED_ERROR);
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setFormError(friendlyAuthError(error.message));
      setIsSubmitting(false);
      return;
    }
    // A full page load lets the server see the new session cookie.
    window.location.assign(next);
  }

  return (
    <div className="grid gap-6">
      <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-5">
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <div className="grid gap-2">
          <AuthField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
          />
          <Link
            href="/forgot-password"
            className="justify-self-end rounded text-sm font-semibold text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Forgot password?
          </Link>
        </div>
        <FormError message={formError} />
        <button type="submit" disabled={isSubmitting} className={SUBMIT_CLASS}>
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      {isGoogleSignInEnabled() && <GoogleButton next={next} />}
    </div>
  );
}
