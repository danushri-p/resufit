import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { OfflineNotice } from "@/components/pwa/OfflineNotice";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { AppShell } from "@/components/AppShell";
import { ProviderFooter } from "@/components/ProviderFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://resufit-one.vercel.app"),
  title: {
    default: "ResuFit – AI resume analyzer",
    template: "%s | ResuFit",
  },
  description: "Compare your resume with a job, get an honest match score, and improve your bullets.",
  applicationName: "ResuFit",
  appleWebApp: {
    capable: true,
    title: "ResuFit",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "ResuFit – AI resume analyzer",
    description: "Compare your resume with a job, get an honest match score, and improve your bullets.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1020",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script below may add the "dark" class before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-stone-50 text-stone-900">
        <AppShell>
          <OfflineNotice />
          <div className="flex flex-1 flex-col">{children}</div>
          <footer className="flex flex-wrap items-center justify-center gap-4 px-4 pb-8 print:hidden">
            <ThemeToggle />
            <ProviderFooter />
          </footer>
        </AppShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
