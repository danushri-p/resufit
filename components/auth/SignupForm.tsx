"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import {
  AuthField,
  EMAIL_PATTERN,
  FormError,
  GoogleButton,
  MIN_PASSWORD_LENGTH,
  NOT_CONFIGURED_ERROR,
  SUBMIT_CLASS,
  friendlyAuthError,
} from "@/components/auth/AuthForm";
import { safeNextPath } from "@/lib/auth/routes";
import { isGoogleSignInEnabled } from "@/lib/supabase/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignupForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = {
      name: name.trim() ? undefined : "Enter your name.",
      email: !email.trim()
        ? "Enter your email."
        : EMAIL_PATTERN.test(email.trim()) ? undefined : "Enter a valid email address.",
      password:
        password.length >= MIN_PASSWORD_LENGTH
          ? undefined
          : `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
    setErrors(fieldErrors);
    setFormError(undefined);
    if (fieldErrors.name || fieldErrors.email || fieldErrors.password) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFormError(NOT_CONFIGURED_ERROR);
      return;
    }
    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setFormError(friendlyAuthError(error.message));
      setIsSubmitting(false);
      return;
    }
    if (data.session) {
      window.location.assign(next);
      return;
    }
    // Email confirmation is on: the account starts after the link is opened.
    setSentTo(email.trim());
    setIsSubmitting(false);
  }

  if (sentTo) {
    return (
      <div role="status" className="grid gap-4 rounded-2xl bg-indigo-50 p-6 text-indigo-950 ring-1 ring-indigo-200">
        <MailCheck aria-hidden="true" className="size-8 text-indigo-700" />
        <p className="text-lg font-semibold">Check your email</p>
        <p>
          We sent a confirmation link to <span className="font-semibold">{sentTo}</span>. Open it on
          this device to finish creating your account.
        </p>
        <Link href="/login" className="font-semibold text-indigo-800 underline underline-offset-2">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-5">
        <AuthField
          label="Full name"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
        />
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <AuthField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        />
        <FormError message={formError} />
        <button type="submit" disabled={isSubmitting} className={SUBMIT_CLASS}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      {isGoogleSignInEnabled() && <GoogleButton next={next} />}
    </div>
  );
}
