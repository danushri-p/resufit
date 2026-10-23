"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { AnalysisCards } from "@/components/results/AnalysisCards";
import { ComparisonResults } from "@/components/compare/ComparisonResults";
import { Button } from "@/components/ui/button";
import {
  clearHistory,
  deleteHistoryEntry,
  getHistoryEntry,
  listHistoryEntries,
  type HistoryEntry,
} from "@/lib/history";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry>();
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setEntries(listHistoryEntries());
      const openId = new URLSearchParams(window.location.search).get("open");
      const requested = openId ? getHistoryEntry(openId) : undefined;
      if (requested) setSelectedEntry(requested);
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function openEntry(id: string) {
    const entry = getHistoryEntry(id);
    if (entry) setSelectedEntry(entry);
  }

  function removeEntry(id: string) {
    deleteHistoryEntry(id);
    setEntries(listHistoryEntries());
    if (selectedEntry?.id === id) setSelectedEntry(undefined);
  }

  function removeAll() {
    clearHistory();
    setEntries([]);
    setSelectedEntry(undefined);
    setConfirmClear(false);
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" aria-label="ResuFit" className="mb-2 inline-flex">
              <Logo />
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
              Analysis history
            </h1>
            <p className="mt-2 text-stone-600">
              Saved only in this browser.
            </p>
          </div>
          <Link
            href="/analyze"
            className="rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Analyze a resume
          </Link>
          <Link
            href="/compare"
            className="rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Compare jobs
          </Link>
          <Link
            href="/tracker"
            className="rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Tracker
          </Link>
          <Link
            href="/data"
            className="rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            Your data
          </Link>
        </header>

        {isLoading ? (
          <p className="text-sm text-stone-600" role="status">
            Loading history…
          </p>
        ) : selectedEntry ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-stone-900">
                {selectedEntry.jobTitle}
              </h2>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedEntry(undefined);
                  if (window.location.search) window.history.replaceState(null, "", "/history");
                }}
              >
                Back to history
              </Button>
            </div>
            {"type" in selectedEntry ? (
              <ComparisonResults result={selectedEntry.comparison} />
            ) : (
              <AnalysisCards
                resume={selectedEntry.result.resume}
                job={selectedEntry.result.job}
                match={selectedEntry.result.match}
                rewrites={selectedEntry.result.rewrites}
                coverLetter={selectedEntry.result.coverLetter}
                interviewPrep={selectedEntry.result.interviewPrep}
              />
            )}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center ring-1 ring-foreground/10">
            <h2 className="text-lg font-medium text-stone-900">
              No saved analyses yet
            </h2>
            <p className="mt-2 text-stone-600">
              Analyze a resume to see it here.
            </p>
            <Link
              href="/analyze"
              className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              Analyze a resume
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-stone-600">
                {entries.length} saved {entries.length === 1 ? "analysis" : "analyses"}
              </p>
              {confirmClear ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-stone-700">Clear all saved analyses?</span>
                  <Button type="button" variant="destructive" onClick={removeAll}>Confirm clear</Button>
                  <Button type="button" variant="outline" onClick={() => setConfirmClear(false)}>Cancel</Button>
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={() => setConfirmClear(true)}>Clear all</Button>
              )}
            </div>
            <ul className="space-y-4">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-xl bg-white p-5 ring-1 ring-foreground/10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-lg font-medium text-stone-900">
                          {entry.jobTitle}
                          {entry.company ? ` · ${entry.company}` : ""}
                        </h2>
                        {"type" in entry && (
                          <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-950">
                            Comparison
                          </span>
                        )}
                      </div>
                      <p className="break-words text-sm text-stone-600">
                        {entry.fileName} · {formatDate(entry.createdAt)}
                      </p>
                      <p className="text-sm text-stone-700">
                        Match {entry.matchScore}/100 · ATS {entry.atsScore}/100
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => openEntry(entry.id)}>Open</Button>
                      <Button type="button" variant="outline" onClick={() => removeEntry(entry.id)}>Delete</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
