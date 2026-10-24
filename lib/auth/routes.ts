/** Pages anyone can open without an account. */
export const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/offline"];
/** Signed-in people are sent on from these pages. */
const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];
/** Pages shown without the app sidebar. */
export const STANDALONE_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password"];
export const DEFAULT_AFTER_LOGIN = "/home";

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/");
}

/** Only follow same-site paths after login, so a crafted link cannot send people to another site. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return DEFAULT_AFTER_LOGIN;
  }
  const path = next.split("?")[0];
  if (GUEST_ONLY_PATHS.includes(path) || path.startsWith("/auth/")) return DEFAULT_AFTER_LOGIN;
  return next;
}

export type AuthDecision =
  | { action: "continue" }
  | { action: "redirect"; to: string }
  | { action: "unauthorized" };

export function decideAuth(pathname: string, search: string, signedIn: boolean): AuthDecision {
  if (pathname.startsWith("/api/")) {
    return signedIn ? { action: "continue" } : { action: "unauthorized" };
  }
  if (signedIn && GUEST_ONLY_PATHS.includes(pathname)) {
    return { action: "redirect", to: DEFAULT_AFTER_LOGIN };
  }
  if (!signedIn && !isPublicPath(pathname)) {
    return { action: "redirect", to: `/login?next=${encodeURIComponent(pathname + search)}` };
  }
  return { action: "continue" };
}
