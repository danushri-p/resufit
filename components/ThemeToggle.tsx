"use client";

import { useEffect, useState } from "react";
import {
  THEME_PREFERENCES,
  applyTheme,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>();

  useEffect(() => {
    const timeout = window.setTimeout(() => setPreference(readThemePreference()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!preference) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(resolveTheme(preference, media.matches));
    update();
    if (preference !== "system") return;
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);

  function choose(next: ThemePreference) {
    saveThemePreference(next);
    setPreference(next);
  }

  return (
    <div role="group" aria-label="Color theme" className="inline-flex rounded-lg p-0.5 ring-1 ring-stone-300">
      {THEME_PREFERENCES.map((option) => {
        const pressed = preference === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={pressed}
            onClick={() => choose(option)}
            className={`rounded-md px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              pressed ? "bg-indigo-600 text-white" : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            {LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
