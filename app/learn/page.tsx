"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { PAGE_CLASS, PageHeader } from "@/components/PageHeader";
import { listHistoryEntries, type HistoryEntry } from "@/lib/history";
import {
  LEARNING_STATUSES,
  buildLearningPlan,
  getSkillStatus,
  readLearningProgress,
  setSkillStatus,
  type LearningProgress,
  type LearningStatus,
} from "@/lib/learning";

const STATUS_LABELS: Record<LearningStatus, string> = {
  "not-started": "Not started",
  learning: "Learning",
  done: "Done",
};

function entryLabel(entry: HistoryEntry): string {
  const date = new Date(entry.createdAt);
  const day = Number.isNaN(date.getTime()) ? "" : ` · ${date.toLocaleDateString()}`;
  if ("type" in entry) return `${entry.jobTitle}${day}`;
  return `${entry.jobTitle}${entry.company ? ` at ${entry.company}` : ""}${day}`;
}

export default function LearnPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [progress, setProgress] = useState<LearningProgress>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const saved = listHistoryEntries();
      const requested = new URLSearchParams(window.location.search).get("from");
      setEntries(saved);
      setSelectedId(saved.some((entry) => entry.id === requested) ? requested! : saved[0]?.id);
      setProgress(readLearningProgress());
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const selected = entries.find((entry) => entry.id === selectedId);
  const plan = selected ? buildLearningPlan(selected) : [];
  const doneCount = plan.filter((item) => getSkillStatus(progress, item.key) === "done").length;

  function changeStatus(key: string, status: LearningStatus) {
    setProgress(setSkillStatus(key, status));
  }

  return (
    <main className={PAGE_CLASS}>
      <PageHeader
        title="Learning plan"
        description="Close your skill gaps with official docs and practice on your own projects."
      />

      {isLoading ? (
        <p className="text-sm text-stone-600" role="status">
          Loading your saved analyses…
        </p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-stone-200">
          <h2 className="text-lg font-medium text-stone-900">Analyze a resume or compare jobs first</h2>
          <p className="mt-2 text-stone-600">
            Your learning plan is built from the skills a job asks for that your resume doesn&apos;t
            show yet.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/analyze"
              className="inline-flex rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
            >
              Analyze a resume
            </Link>
            <Link
              href="/compare"
              className="inline-flex rounded-lg px-4 py-2 text-sm font-medium text-indigo-800 ring-1 ring-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
            >
              Compare jobs
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-2 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
            <label htmlFor="plan-source" className="text-sm font-medium text-stone-800">
              Plan based on
            </label>
            <select
              id="plan-source"
              className="w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entryLabel(entry)}
                </option>
              ))}
            </select>
            {plan.length > 0 && (
              <p className="text-sm text-stone-700" role="status">
                {doneCount} of {plan.length} {plan.length === 1 ? "skill" : "skills"} done.
              </p>
            )}
          </div>

          {plan.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-stone-200">
              <h2 className="text-lg font-medium text-stone-900">No missing skills here</h2>
              <p className="mt-2 text-stone-600">
                Your resume already shows every skill this job lists. Pick another analysis or
                compare more jobs.
              </p>
            </div>
          ) : (
            <ol className="space-y-4" aria-label="Skills to learn">
              {plan.map((item) => {
                const status = getSkillStatus(progress, item.key);
                return (
                  <li key={item.key} className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <span
                          aria-hidden="true"
                          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"
                        >
                          <BookOpen className="size-5" />
                        </span>
                        <div className="min-w-0 space-y-1">
                          <h2 className="text-lg font-semibold text-stone-900">{item.skill}</h2>
                          <p className="text-sm text-stone-700">
                            <span
                              className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                item.priority === "must"
                                  ? "bg-red-100 text-red-950"
                                  : "bg-stone-200 text-stone-900"
                              }`}
                            >
                              {item.priority === "must" ? "Must-have" : "Nice to have"}
                            </span>
                            {item.reason}
                          </p>
                        </div>
                      </div>
                      <div
                        role="group"
                        aria-label={`Progress for ${item.skill}`}
                        className="inline-flex rounded-lg p-0.5 ring-1 ring-stone-300"
                      >
                        {LEARNING_STATUSES.map((option) => (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={status === option}
                            onClick={() => changeStatus(item.key, option)}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                              status === option
                                ? "bg-indigo-600 text-white"
                                : "text-stone-700 hover:bg-stone-100"
                            }`}
                          >
                            {STATUS_LABELS[option]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div className="space-y-1">
                        <dt className="font-medium text-stone-900">1. Learn</dt>
                        <dd>
                          <a
                            href={item.resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-800 underline underline-offset-2 hover:text-indigo-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
                          >
                            {item.resource.title}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                          {!item.resource.official && (
                            <span className="block text-xs text-stone-600">
                              No curated link yet; check that a result is the official site.
                            </span>
                          )}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="font-medium text-stone-900">2. Practice</dt>
                        <dd className="text-stone-700">{item.practice}</dd>
                      </div>
                    </dl>

                    {status === "done" && (
                      <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-950">
                        3. Once you&apos;ve built the practice project, you can honestly add{" "}
                        {item.skill} to your resume and mention what you built.
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </main>
  );
}
