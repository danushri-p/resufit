import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ResuFit – AI resume analyzer",
    short_name: "ResuFit",
    description:
      "Compare your resume with a job, get an honest match score, and track your applications.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#FAFAF9",
    theme_color: "#0B1020",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Analyze a resume", url: "/analyze" },
      { name: "Compare jobs", url: "/compare" },
      { name: "Application tracker", url: "/tracker" },
    ],
  };
}
