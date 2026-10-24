"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

let client: SupabaseClient | null | undefined;

/** Browser Supabase client, or null when accounts are not configured. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const config = getSupabaseConfig();
  client = config ? createBrowserClient(config.url, config.key) : null;
  return client;
}
