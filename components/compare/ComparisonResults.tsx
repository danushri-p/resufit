"use client";

import { TrackApplicationButton } from "@/components/TrackApplicationButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CompareResult } from "@/lib/schemas";

interface ComparisonResultsProps {
  result: CompareResult;
  onOpenFullAnalysis?: (index: number) => void;
  labels?: string[];
  /** When set (including null), each card shows "Track this application". */
  trackHistoryId?: string | null;
}

export function ComparisonResults({
  result,
  onOpenFullAnalysis,
  labels,
  trackHistoryId,
}: ComparisonResultsProps) {
  const rankedJobs = [...result.jobs]
    .filter((entry) => entry.job && entry.match)
    .sort((first, second) => second.match!.score - first.match!.score);
  const errors = result.jobs.filter((entry) => entry.error);

  return (
    <div className="grid min-w-0 gap-6" aria-label="Comparison results">
      <section aria-label="Ranked job matches" className="grid min-w-0 gap-4">
        {rankedJobs.map((entry, rank) => {
          const job = entry.job!;
          const match = entry.match!;
          const title =
            labels?.[entry.index]?.trim() ||
            job.jobTitle?.trim() ||
            `Job ${entry.index + 1}`;
          const totalMustHave = job.mustHaveSkills.length;
          return (
            <Card key={entry.index}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="break-words text-lg">
                      {title}
                    </CardTitle>
                    {job.company && (
                      <CardDescription className="break-words">
                        {job.company}
                      </CardDescription>
                    )}
                  </div>
                  {rank === 0 && rankedJobs.length > 0 && (
                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-950">
                      Best fit
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <p className="text-4xl font-semibold tracking-tight text-stone-900">
                    {match.score}
                    <span className="text-xl text-stone-500">/100</span>
                  </p>
                  <p className="font-medium text-indigo-800">{match.label}</p>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${title} match score`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={match.score}
                  className="h-3 overflow-hidden rounded-full bg-stone-200"
                >
                  <div
                    className="h-full rounded-full bg-indigo-700"
                    style={{ width: `${match.score}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-700">
                  <p>
                    Must-have coverage: {match.matchedMustHave.length}/
                    {totalMustHave}
                  </p>
                  <p>ATS keyword coverage: {entry.atsKeywordCoverage ?? 0}%</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-stone-900">
                    Top missing must-haves
                  </h3>
                  {match.missingMustHave.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {match.missingMustHave.slice(0, 3).map((skill) => (
                        <li
                          key={skill}
                          className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-950"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-stone-600">
                      No missing must-have skills.
                    </p>
                  )}
                </div>
                {(onOpenFullAnalysis || trackHistoryId !== undefined) && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
                    {onOpenFullAnalysis && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenFullAnalysis(entry.index)}
                      >
                        Open full analysis
                      </Button>
                    )}
                    {trackHistoryId !== undefined && (
                      <TrackApplicationButton
                        role={job.jobTitle ?? title}
                        company={job.company}
                        matchScore={match.score}
                        historyId={trackHistoryId}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {errors.map((entry) => (
          <Card key={entry.index}>
            <CardHeader>
              <CardTitle>Job {entry.index + 1} could not be analyzed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-700" role="status">
                {entry.error}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Skills to learn next</CardTitle>
          <CardDescription>
            Must-have skills missing from the most jobs appear first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.skillGaps.length ? (
            <ul className="space-y-3">
              {result.skillGaps.map((gap) => (
                <li
                  key={gap.skill}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-stone-200 pb-3 last:border-0"
                >
                  <span className="font-medium text-stone-900">{gap.skill}</span>
                  <span className="text-sm text-stone-700">
                    missing in {gap.missingIn} of {rankedJobs.length} jobs
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-700">
              No must-have skill gaps across these jobs.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
