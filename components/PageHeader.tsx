import type { ReactNode } from "react";

/** Shared page width and spacing inside the app shell. */
export const PAGE_CLASS =
  "mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 lg:py-10";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-4 ${className ?? ""}`}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{title}</h1>
        {description && <p className="text-stone-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
