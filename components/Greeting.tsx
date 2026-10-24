"use client";

import { useUser } from "@/lib/auth/useUser";

export function Greeting() {
  const { user } = useUser();
  return (
    <p className="font-medium text-stone-600">
      {user ? `Welcome back, ${user.firstName} 👋` : "Welcome to ResuFit 👋"}
    </p>
  );
}
