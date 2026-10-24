"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const SUBMIT_CLASS =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-lg shadow-indigo-300/40 transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const NOT_CONFIGURED_ERROR =
  "Accounts aren't set up on this copy of ResuFit yet. Add the Supabase keys to turn on login.";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function AuthField({ label, error, hint, type = "text", ...input }: AuthFieldProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ");

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-stone-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          className={`h-12 w-full rounded-xl border bg-white px-4 text-stone-900 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
            isPassword ? "pr-12" : ""
          } ${error ? "border-red-500" : "border-stone-300"}`}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-pressed={revealed}
            className="absolute right-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            {revealed ? <EyeOff aria-hidden="true" className="size-4.5" /> : <Eye aria-hidden="true" className="size-4.5" />}
            <span className="sr-only">Show password</span>
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-stone-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {message}
    </p>
  );
}

/** Supabase error messages, rewritten in plain language. */
export function friendlyAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (text.includes("email not confirmed")) {
    return "Please confirm your email first. Check your inbox for the link we sent.";
  }
  if (text.includes("already registered")) return "An account with this email already exists. Try logging in.";
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (text.includes("provider is not enabled")) return "Google sign-in isn't turned on for this site yet.";
  if (text.includes("password should be")) return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
  return message || "Something went wrong. Please try again.";
}

export function GoogleButton({ next }: { next: string }) {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function signIn() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(NOT_CONFIGURED_ERROR);
      return;
    }
    setIsLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) {
      setError(friendlyAuthError(oauthError.message));
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-stone-500">
        <span className="h-px flex-1 bg-stone-200" />
        or
        <span className="h-px flex-1 bg-stone-200" />
      </div>
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={isLoading}
        className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-5 font-semibold text-stone-900 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>
      <FormError message={error} />
    </div>
  );
}
