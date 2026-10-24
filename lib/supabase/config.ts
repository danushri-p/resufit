export interface SupabaseConfig {
  url: string;
  key: string;
}

/**
 * Accounts are enabled when both public Supabase values are set. Without them
 * (local development, CI) the app stays open and the login pages explain why.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  return url && key ? { url, key } : null;
}

export function isGoogleSignInEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED === "true";
}
