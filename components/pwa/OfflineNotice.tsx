"use client";

import { useEffect, useState } from "react";

export function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    const timeout = window.setTimeout(update, 0);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      You&apos;re offline. Your tracker, history and data page still work; analysis, cover letters
      and interview prep need a connection.
    </div>
  );
}
