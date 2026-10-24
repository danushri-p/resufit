"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface AppUser {
  email: string;
  name: string;
  firstName: string;
}

export function toAppUser(user: User | null | undefined): AppUser | null {
  if (!user) return null;
  const email = user.email ?? "";
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  const name =
    (typeof metadataName === "string" && metadataName.trim()) || email.split("@")[0] || "there";
  return { email, name, firstName: name.split(/\s+/)[0] };
}

/** The signed-in person, kept in sync with login and logout in other tabs. */
export function useUser(): { user: AppUser | null; isLoading: boolean } {
  const [state, setState] = useState<{ user: AppUser | null; isLoading: boolean }>({
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      const timeout = window.setTimeout(() => setState({ user: null, isLoading: false }), 0);
      return () => window.clearTimeout(timeout);
    }
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setState({ user: toAppUser(data.user), isLoading: false });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ user: toAppUser(session?.user), isLoading: false });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOut(): Promise<void> {
  await getSupabaseBrowserClient()?.auth.signOut();
  // A full page load also clears pages Next.js keeps mounted in memory.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/login");
}
