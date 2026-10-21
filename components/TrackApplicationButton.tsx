"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { findTrackedApplication, saveApplication } from "@/lib/tracker";

interface TrackApplicationButtonProps {
  role: string | null | undefined;
  company: string | null | undefined;
  matchScore: number | null;
  historyId: string | null;
  jobUrl?: string | null;
}

export function TrackApplicationButton({
  role,
  company,
  matchScore,
  historyId,
  jobUrl = null,
}: TrackApplicationButtonProps) {
  const roleName = role?.trim() || "Untitled role";
  const companyName = company?.trim() || "Unknown company";
  const [isTracked, setIsTracked] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsTracked(
        Boolean(
          findTrackedApplication({
            historyId,
            role: roleName,
            company: companyName,
          }),
        ),
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [historyId, roleName, companyName]);

  function track() {
    if (
      findTrackedApplication({ historyId, role: roleName, company: companyName })
    ) {
      setIsTracked(true);
      return;
    }
    const saved = saveApplication({
      role: roleName.slice(0, 120),
      company: companyName.slice(0, 120),
      status: "saved",
      appliedOn: null,
      followUpOn: null,
      jobUrl,
      notes: "",
      matchScore: matchScore === null ? null : Math.round(matchScore),
      historyId,
    });
    if (saved) {
      setIsTracked(true);
      setError(undefined);
    } else {
      setError("Could not save to the tracker in this browser.");
    }
  }

  if (isTracked) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-stone-700" role="status">
        Tracked —
        <Link
          href="/tracker"
          className="font-medium text-indigo-800 underline underline-offset-2 hover:text-indigo-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
        >
          View tracker
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" onClick={track}>
        Track this application
      </Button>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
