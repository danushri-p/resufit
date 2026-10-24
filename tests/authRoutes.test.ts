import { describe, expect, it } from "vitest";
import { decideAuth, safeNextPath } from "@/lib/auth/routes";

describe("auth routing", () => {
  it("sends signed-out visitors of app pages to login and remembers where they were going", () => {
    expect(decideAuth("/analyze", "?view=cover-letter", false)).toEqual({
      action: "redirect",
      to: "/login?next=%2Fanalyze%3Fview%3Dcover-letter",
    });
    expect(decideAuth("/home", "", false)).toEqual({ action: "redirect", to: "/login?next=%2Fhome" });
    expect(decideAuth("/reset-password", "", false)).toEqual({
      action: "redirect",
      to: "/login?next=%2Freset-password",
    });
  });

  it("keeps the landing, auth and offline pages public", () => {
    for (const path of ["/", "/login", "/signup", "/forgot-password", "/offline", "/auth/callback"]) {
      expect(decideAuth(path, "", false)).toEqual({ action: "continue" });
    }
  });

  it("rejects AI requests without a session instead of redirecting", () => {
    expect(decideAuth("/api/analyze", "", false)).toEqual({ action: "unauthorized" });
    expect(decideAuth("/api/analyze", "", true)).toEqual({ action: "continue" });
  });

  it("sends signed-in people from login and signup to the app", () => {
    expect(decideAuth("/login", "", true)).toEqual({ action: "redirect", to: "/home" });
    expect(decideAuth("/signup", "", true)).toEqual({ action: "redirect", to: "/home" });
    expect(decideAuth("/", "", true)).toEqual({ action: "continue" });
    expect(decideAuth("/reset-password", "", true)).toEqual({ action: "continue" });
  });

  it("only follows same-site next paths", () => {
    expect(safeNextPath("/tracker?x=1")).toBe("/tracker?x=1");
    expect(safeNextPath("https://evil.example")).toBe("/home");
    expect(safeNextPath("//evil.example")).toBe("/home");
    expect(safeNextPath("/\\evil.example")).toBe("/home");
    expect(safeNextPath("/login")).toBe("/home");
    expect(safeNextPath(null)).toBe("/home");
  });
});
