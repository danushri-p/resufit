"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  backupFileName,
  createBackup,
  deleteAllData,
  parseBackup,
  restoreBackup,
  type ParsedBackup,
} from "@/lib/backup";
import { listHistoryEntries } from "@/lib/history";
import { listApplications } from "@/lib/tracker";

const NAV_LINK =
  "rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600";
const SECTION = "space-y-4 rounded-xl bg-white p-5 ring-1 ring-foreground/10";

type PendingRestore = Extract<ParsedBackup, { success: true }> & { fileName: string };

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export default function DataPage() {
  const [counts, setCounts] = useState<{ history: number; applications: number }>();
  const [pending, setPending] = useState<PendingRestore>();
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [restoreError, setRestoreError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function refreshCounts() {
    setCounts({
      history: listHistoryEntries().length,
      applications: listApplications().length,
    });
  }

  useEffect(() => {
    const timeout = window.setTimeout(refreshCounts, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function downloadBackup() {
    const backup = createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName();
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      `Backup downloaded with ${plural(backup.history.length, "analysis", "analyses")} and ${plural(backup.applications.length, "application", "applications")}.`,
    );
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setPending(undefined);
    setRestoreError(undefined);
    setMessage(undefined);
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      setRestoreError("Could not read this file.");
      return;
    }
    const parsed = parseBackup(text);
    if (!parsed.success) {
      setRestoreError(parsed.error);
      return;
    }
    if (!parsed.backup.history.length && !parsed.backup.applications.length) {
      setRestoreError("This backup doesn't contain any analyses or applications.");
      return;
    }
    setMode("merge");
    setPending({ ...parsed, fileName: file.name });
  }

  function restore() {
    if (!pending) return;
    const summary = restoreBackup(pending.backup, mode);
    if (!summary) {
      setRestoreError("Could not save in this browser. Storage may be full or blocked.");
      return;
    }
    const skipped = summary.history.skipped + summary.applications.skipped;
    setMessage(
      `Restored ${plural(summary.history.imported, "analysis", "analyses")} and ${plural(summary.applications.imported, "application", "applications")}.` +
        (skipped
          ? ` ${plural(skipped, "item was", "items were")} skipped because ${skipped === 1 ? "it was" : "they were"} already saved or over the storage limit.`
          : ""),
    );
    setPending(undefined);
    refreshCounts();
  }

  function removeEverything() {
    deleteAllData();
    setConfirmDelete(false);
    setPending(undefined);
    setMessage("All ResuFit data was deleted from this browser.");
    refreshCounts();
  }

  const hasData = Boolean(counts && (counts.history || counts.applications));

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" aria-label="ResuFit" className="mb-2 inline-flex">
              <Logo />
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Your data</h1>
            <p className="mt-2 text-stone-600">
              Everything ResuFit saves stays in this browser. Nothing is stored on our servers.
            </p>
          </div>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-2">
            <Link href="/analyze" className={NAV_LINK}>
              Analyze a resume
            </Link>
            <Link href="/history" className={NAV_LINK}>
              History
            </Link>
            <Link href="/tracker" className={NAV_LINK}>
              Tracker
            </Link>
          </nav>
        </header>

        {message && (
          <p className="rounded-lg bg-green-100 px-4 py-3 text-sm font-medium text-green-950" role="status">
            {message}
          </p>
        )}

        <section aria-labelledby="stored-heading" className={SECTION}>
          <h2 id="stored-heading" className="text-lg font-medium text-stone-900">
            Saved in this browser
          </h2>
          {counts ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              <li className="rounded-lg bg-stone-100 p-3">
                <p className="text-sm text-stone-700">Analyses and comparisons</p>
                <p className="text-2xl font-semibold text-stone-900">{counts.history}</p>
              </li>
              <li className="rounded-lg bg-stone-100 p-3">
                <p className="text-sm text-stone-700">Tracked applications</p>
                <p className="text-2xl font-semibold text-stone-900">{counts.applications}</p>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-stone-600" role="status">
              Loading your data…
            </p>
          )}
          <p className="text-sm text-stone-700">
            Clearing your browser&apos;s site data deletes all of this. Download a backup to keep
            a copy or to move it to another browser or device.
          </p>
        </section>

        <section aria-labelledby="backup-heading" className={SECTION}>
          <h2 id="backup-heading" className="text-lg font-medium text-stone-900">
            Back up
          </h2>
          <p className="text-sm text-stone-700">
            Downloads a file with your analyses, cover letters, interview prep, tracked
            applications, and learning progress. Keep it private: it can include details from your resume.
          </p>
          <Button type="button" onClick={downloadBackup} disabled={!hasData}>
            Download backup
          </Button>
        </section>

        <section aria-labelledby="restore-heading" className={SECTION}>
          <h2 id="restore-heading" className="text-lg font-medium text-stone-900">
            Restore
          </h2>
          <p className="text-sm text-stone-700">Choose a ResuFit backup file (.json).</p>
          <div>
            <label htmlFor="backup-file" className="sr-only">
              Backup file
            </label>
            <input
              id="backup-file"
              type="file"
              accept=".json,application/json"
              onChange={(event) => void chooseFile(event)}
              aria-describedby={restoreError ? "restore-error" : undefined}
              className="block w-full min-w-0 text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-800 hover:file:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            />
          </div>
          {restoreError && (
            <p id="restore-error" className="text-sm text-red-700" role="alert">
              {restoreError}
            </p>
          )}
          {pending && (
            <div className="space-y-4 rounded-lg bg-stone-100 p-4">
              <p className="text-sm text-stone-800">
                <span className="font-medium">{pending.fileName}</span> contains{" "}
                {plural(pending.backup.history.length, "analysis", "analyses")} and{" "}
                {plural(pending.backup.applications.length, "application", "applications")}.
                {pending.invalidCount > 0 &&
                  ` ${plural(pending.invalidCount, "damaged item", "damaged items")} will be skipped.`}
              </p>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-stone-900">How to restore</legend>
                <label className="flex items-start gap-2 text-sm text-stone-800">
                  <input
                    type="radio"
                    name="restore-mode"
                    value="merge"
                    checked={mode === "merge"}
                    onChange={() => setMode("merge")}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Merge</span> with what&apos;s already saved
                    (items you already have are kept)
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-stone-800">
                  <input
                    type="radio"
                    name="restore-mode"
                    value="replace"
                    checked={mode === "replace"}
                    onChange={() => setMode("replace")}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Replace</span> everything saved in this browser
                    with the backup
                  </span>
                </label>
              </fieldset>
              {mode === "replace" && hasData && (
                <p className="text-sm font-medium text-red-800">
                  Your current analyses and applications will be deleted first.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={restore}>
                  Restore backup
                </Button>
                <Button type="button" variant="outline" onClick={() => setPending(undefined)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="delete-heading" className={SECTION}>
          <h2 id="delete-heading" className="text-lg font-medium text-stone-900">
            Delete all data
          </h2>
          <p className="text-sm text-stone-700">
            Permanently deletes every saved analysis, comparison, cover letter, interview prep,
            tracked application, and learning progress from this browser. This can&apos;t be undone.
          </p>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-stone-800">Delete everything?</span>
              <Button type="button" variant="destructive" onClick={removeEverything}>
                Delete everything
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmDelete(true);
                setMessage(undefined);
              }}
              disabled={!hasData}
            >
              Delete all data
            </Button>
          )}
        </section>
      </div>
    </main>
  );
}
