"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Columns3,
  FileText,
  GraduationCap,
  History,
  House,
  Mail,
  Menu,
  MessagesSquare,
  ScanSearch,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** For links into a view of the analyze page, e.g. ?view=cover-letter. */
  view?: string;
}

const MAIN_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/analyze", label: "Analyze", icon: ScanSearch },
  { href: "/history", label: "History", icon: History },
  { href: "/compare", label: "Compare jobs", icon: Columns3 },
  { href: "/tracker", label: "Tracker", icon: ClipboardList },
  { href: "/analyze?view=cover-letter", label: "Cover letter", icon: Mail, view: "cover-letter" },
  { href: "/analyze?view=interview", label: "Interview prep", icon: MessagesSquare, view: "interview" },
  { href: "/resume", label: "Tailored resume", icon: FileText },
  { href: "/learn", label: "Learning plan", icon: GraduationCap },
];

const NAV_VIEWS = new Set(MAIN_ITEMS.flatMap((item) => (item.view ? [item.view] : [])));

const ITEM_CLASS =
  "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";

function isActive(item: NavItem, pathname: string, view: string | null): boolean {
  const path = item.href.split("?")[0];
  if (path !== pathname) return false;
  if (item.view) return view === item.view;
  // The plain Analyze link is active unless a sidebar view (cover letter, interview) is open.
  return path !== "/analyze" || !view || !NAV_VIEWS.has(view);
}

function NavLinks({ view, onNavigate }: { view: string | null; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="grid gap-1">
      {MAIN_ITEMS.map((item) => {
        const active = isActive(item, pathname, view);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={`${ITEM_CLASS} ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon aria-hidden="true" className="size-4.5 shrink-0" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NavLinksWithView({ onNavigate }: { onNavigate?: () => void }) {
  const view = useSearchParams().get("view");
  return <NavLinks view={view} onNavigate={onNavigate} />;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <nav aria-label="Main navigation" className="flex-1">
        <Suspense fallback={<NavLinks view={null} onNavigate={onNavigate} />}>
          <NavLinksWithView onNavigate={onNavigate} />
        </Suspense>
      </nav>
      <div className="grid gap-1 border-t border-sidebar-border pt-4">
        <Link
          href="/data"
          aria-current={pathname === "/data" ? "page" : undefined}
          onClick={onNavigate}
          className={`${ITEM_CLASS} ${
            pathname === "/data"
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
        >
          <Settings aria-hidden="true" className="size-4.5 shrink-0" />
          Your data
        </Link>
        <InstallAppButton
          className={`${ITEM_CLASS} text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`}
        />
      </div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 text-sm font-medium text-stone-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 overflow-y-auto bg-sidebar px-4 py-6 lg:flex print:hidden">
        <Link
          href="/"
          aria-label="ResuFit home"
          className="inline-flex rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Logo size={30} tone="onDark" />
        </Link>
        <SidebarContent />
      </aside>

      <div className="sticky top-0 z-30 bg-sidebar lg:hidden print:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="ResuFit home"
            className="inline-flex min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <Logo size={28} tone="onDark" />
          </Link>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-10 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
        {menuOpen && (
          <div
            id="mobile-menu"
            className="flex max-h-[calc(100vh-4rem)] flex-col gap-4 overflow-y-auto border-t border-sidebar-border px-4 pb-5 pt-3"
          >
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </div>
        )}
      </div>

      <div id="content" className="flex min-h-screen min-w-0 flex-col lg:pl-64 print:min-h-0 print:pl-0">
        {children}
      </div>
    </>
  );
}
