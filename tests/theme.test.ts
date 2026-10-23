import { afterEach, describe, expect, it, vi } from "vitest";
import {
  THEME_INIT_SCRIPT,
  isThemePreference,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
} from "@/lib/theme";

function stubStorage(initial: Record<string, string> = {}, shouldThrow = false) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => {
      if (shouldThrow) throw new Error("blocked");
      return store.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (shouldThrow) throw new Error("blocked");
      store.set(key, value);
    },
    removeItem: (key: string) => {
      if (shouldThrow) throw new Error("blocked");
      store.delete(key);
    },
  });
  return store;
}

function runInitScript(stored: string | null, systemDark: boolean): boolean {
  const classes = new Set<string>();
  const run = new Function("localStorage", "window", "document", THEME_INIT_SCRIPT);
  run(
    { getItem: () => stored },
    { matchMedia: () => ({ matches: systemDark }) },
    { documentElement: { classList: { add: (name: string) => classes.add(name) } } },
  );
  return classes.has("dark");
}

afterEach(() => vi.unstubAllGlobals());

describe("theme", () => {
  it("resolves the system preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("validates stored preferences", () => {
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("purple")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it("reads and saves the preference, storing nothing for system", () => {
    const store = stubStorage();
    expect(readThemePreference()).toBe("system");
    saveThemePreference("dark");
    expect(readThemePreference()).toBe("dark");
    saveThemePreference("system");
    expect(store.size).toBe(0);
    stubStorage({ "resufit:theme": "neon" });
    expect(readThemePreference()).toBe("system");
  });

  it("falls back to system when storage is blocked", () => {
    stubStorage({}, true);
    expect(readThemePreference()).toBe("system");
    expect(() => saveThemePreference("dark")).not.toThrow();
  });

  it("applies dark mode before paint from the inline script", () => {
    expect(runInitScript("dark", false)).toBe(true);
    expect(runInitScript("light", true)).toBe(false);
    expect(runInitScript(null, true)).toBe(true);
    expect(runInitScript(null, false)).toBe(false);
  });
});
