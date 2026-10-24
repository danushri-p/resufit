import Link from "next/link";
import type { ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getSupabaseConfig } from "@/lib/supabase/config";

interface AuthShellProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Split layout for the login, signup and password pages. */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  const configured = Boolean(getSupabaseConfig());
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <Link
          href="/"
          aria-label="ResuFit home"
          className="inline-flex self-start rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          <Logo size={30} />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-5xl leading-tight text-stone-900">{title}</h1>
          <p className="mt-2 text-stone-600">{description}</p>
          {!configured && (
            <div
              role="note"
              className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
            >
              Accounts aren&apos;t set up on this copy of ResuFit yet (the Supabase keys are
              missing), so you can use the app without logging in.{" "}
              <Link href="/home" className="font-semibold underline underline-offset-2">
                Open ResuFit
              </Link>
            </div>
          )}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-stone-600">{footer}</div>}
        </div>
      </main>

      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-center"
      >
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-[#6366F1]/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-[#22D3EE]/15 blur-3xl" />
        <div className="relative max-w-md">
          <Logo size={44} tone="onDark" />
          <p className="mt-10 font-display text-5xl leading-tight text-sidebar-accent-foreground">
            Fit every application, <span className="italic text-[#67E8F9]">honestly.</span>
          </p>
          <ul className="mt-8 grid gap-3">
            {[
              "Match score and ATS check for any job",
              "Rewrites that never invent experience",
              "Tailored resume, cover letter and interview prep",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CircleCheck className="size-5 shrink-0 text-[#67E8F9]" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 grid gap-3">
            <span className="inline-flex w-fit -rotate-1 items-center gap-2 rounded-xl bg-[#FFFFFF]/10 px-3.5 py-2 text-sm text-sidebar-accent-foreground ring-1 ring-[#FFFFFF]/15">
              <span className="size-2 rounded-full bg-[#4ADE80]" /> React — Matched
            </span>
            <span className="ml-10 inline-flex w-fit rotate-1 items-center gap-2 rounded-xl bg-[#FFFFFF]/10 px-3.5 py-2 text-sm text-sidebar-accent-foreground ring-1 ring-[#FFFFFF]/15">
              <span className="size-2 rounded-full bg-[#FBBF24]" /> Docker — To learn
            </span>
            <span className="ml-4 inline-flex w-fit items-center gap-2 rounded-xl bg-[#FFFFFF]/10 px-3.5 py-2 text-sm text-sidebar-accent-foreground ring-1 ring-[#FFFFFF]/15">
              <span className="size-2 rounded-full bg-[#A5B4FC]" /> Bullet rewritten
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
