"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PAGE_CLASS, PageHeader } from "@/components/PageHeader";
import { AnalysisCards, savedExtraTabs } from "@/components/results/AnalysisCards";
import { scoreTone } from "@/components/results/ScoreRing";
import { Search } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visibleEntries = needle
    ? entries.filter((entry) =>
        [entry.jobTitle, entry.company, entry.fileName].some((value) =>
          value.toLowerCase().includes(needle),
        ),
      )
    : entries;

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
    <main className={PAGE_CLASS}>
      <PageHeader
        title="Analysis history"
        description="Saved only in this browser."
      />

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
              subtitle={`${selectedEntry.fileName} · analyzed ${formatDate(selectedEntry.createdAt)}`}
              extraTabs={savedExtraTabs(
                selectedEntry.result.coverLetter,
                selectedEntry.result.interviewPrep,
              )}
            />
          )}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-stone-200">
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
          <label className="relative block max-w-sm">
            <span className="sr-only">Search history</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by company, role or file…"
              className="h-10 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            />
          </label>
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,1fr)_7rem_8rem_11rem] gap-4 border-b border-stone-200 bg-stone-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-600 md:grid"
            >
              <span>Company / role</span>
              <span>Match score</span>
              <span>Date</span>
              <span>Actions</span>
            </div>
            {visibleEntries.length === 0 && (
              <p className="px-5 py-6 text-sm text-stone-600">No saved items match “{query}”.</p>
            )}
            <ul className="divide-y divide-stone-200">
              {visibleEntries.map((entry) => {
                const tone = scoreTone(entry.matchScore);
                const initial = (entry.company || entry.jobTitle).trim().charAt(0).toUpperCase() || "?";
                return (
                  <li
                    key={entry.id}
                    className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_7rem_8rem_11rem] md:items-center md:gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-800"
                      >
                        {initial}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="break-words font-semibold text-stone-900">
                            {entry.jobTitle}
                            {entry.company ? ` · ${entry.company}` : ""}
                          </h2>
                          {"type" in entry && (
                            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-950">
                              Comparison
                            </span>
                          )}
                        </div>
                        <p className="break-words text-sm text-stone-600">{entry.fileName}</p>
                      </div>
                    </div>
                    <p className="text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${tone.bg} ${tone.text}`}>
                        {entry.matchScore}%
                      </span>
                      <span className="sr-only">
                        {" "}Match {entry.matchScore}/100 · ATS {entry.atsScore}/100
                      </span>
                      <span aria-hidden="true" className="ml-2 text-xs text-stone-600 md:block md:ml-0 md:mt-1">
                        ATS {entry.atsScore}
                      </span>
                    </p>
                    <p className="text-sm text-stone-700">{formatDate(entry.createdAt)}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => openEntry(entry.id)}>Open</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => removeEntry(entry.id)}>Delete</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </main>
  );
}
