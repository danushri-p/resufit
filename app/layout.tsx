import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OfflineNotice } from "@/components/pwa/OfflineNotice";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script below may add the "dark" class before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <OfflineNotice />
        {children}
        <footer className="flex justify-center bg-stone-50 px-4 pb-8 print:hidden">
          <ThemeToggle />
        </footer>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
