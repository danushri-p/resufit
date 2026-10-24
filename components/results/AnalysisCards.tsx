"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  FileDown,
  Lightbulb,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreBar, ScoreRing } from "@/components/results/ScoreRing";
import type {
  JobRequirements,
  MatchResult,
  ProjectBulletRewrites,
  Resume,
  InterviewPrepResult,
} from "@/lib/schemas";

export type BulletChoice = "accepted" | "rejected";

export interface ResultsTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface AnalysisCardsProps {
  resume: Resume;
  job: JobRequirements;
  match: MatchResult;
  rewrites?: ProjectBulletRewrites[];
  coverLetter?: string;
  interviewPrep?: InterviewPrepResult;
  isMatching?: boolean;
  isRewriting?: boolean;
  retryCountdown?: number;
  matchError?: string;
  suggestionsError?: string;
  rewriteError?: string;
  copiedBullet?: string;
  onRewrite?: () => void;
  onRetrySuggestions?: () => void;
  onRetryMatch?: () => void;
  onDownload?: () => void;
  onCopy?: (id: string, content: string) => void;
  /** Opens the tailored resume builder with the current bullet choices. */
  onBuildResume?: () => void;
  extraActions?: ReactNode;
  /** Shown under the job title, e.g. "Analyzed on 12 Apr 2026". */
  subtitle?: string;
  /** Controlled tab; when omitted the component keeps its own tab state. */
  tab?: string;
  onTabChange?: (tab: string) => void;
  /** Extra tabs after the built-in ones (cover letter, interview prep). */
  extraTabs?: ResultsTab[];
  bulletChoices?: Record<string, BulletChoice>;
  onBulletChoice?: (id: string, choice: BulletChoice | undefined) => void;
}

export function bulletId(projectName: string, index: number): string {
  return `${projectName}-${index}`;
}

function SkillChips({
  skills,
  status,
}: {
  skills: string[];
  status?: "matched" | "missing";
}) {
  if (!skills.length) return <p className="text-sm text-stone-500">None.</p>;
  const color =
    status === "matched"
      ? "bg-green-50 text-green-800 ring-green-200"
      : status === "missing"
        ? "bg-red-50 text-red-800 ring-red-200"
        : "bg-indigo-50 text-indigo-800 ring-indigo-200";

  return (
    <ul className="flex flex-wrap gap-2">
      {skills.map((skill, index) => (
        <li key={`${skill}-${index}`} className={`rounded-full px-3 py-1 text-sm ring-1 ${color}`}>
          {skill}
        </li>
      ))}
    </ul>
  );
}

function coverage(matched: number, missing: number): number | undefined {
  const total = matched + missing;
  return total ? Math.round((matched / total) * 100) : undefined;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-semibold text-stone-900">{children}</h3>;
}

function OverviewPanel(props: AnalysisCardsProps & { onShowTab: (tab: string) => void }) {
  const {
    match,
    isMatching = false,
    isRewriting = false,
    retryCountdown = 0,
    matchError,
    suggestionsError,
    rewriteError,
    onRewrite,
    onRetrySuggestions,
    onRetryMatch,
    onDownload,
    onBuildResume,
    extraActions,
  } = props;
  const mustHave = coverage(match.matchedMustHave.length, match.missingMustHave.length);
  const niceToHave = coverage(match.matchedNiceToHave.length, match.missingNiceToHave.length);
  const keywordCheck = match.ats.checks.find((check) => check.id === "keywords");
  const skills = [
    ...match.matchedMustHave.map((skill) => ({ skill, matched: true, nice: false })),
    ...match.missingMustHave.map((skill) => ({ skill, matched: false, nice: false })),
    ...match.matchedNiceToHave.map((skill) => ({ skill, matched: true, nice: true })),
    ...match.missingNiceToHave.map((skill) => ({ skill, matched: false, nice: true })),
  ];
  const matchedCount = match.matchedMustHave.length + match.matchedNiceToHave.length;
  const missingCount = match.missingMustHave.length + match.missingNiceToHave.length;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {isMatching && (
        <p className="text-sm text-indigo-700 lg:col-span-2" role="status">
          Calculating your match and generating suggestions…
        </p>
      )}
      <Card>
        <CardContent className="space-y-4">
          <SectionTitle>Scores</SectionTitle>
          <ScoreBar label="Overall match" score={match.score} detail={match.label} />
          {mustHave !== undefined && (
            <ScoreBar
              label="Must-have skills"
              score={mustHave}
              detail={`${match.matchedMustHave.length} of ${match.matchedMustHave.length + match.missingMustHave.length} found in your resume`}
            />
          )}
          {niceToHave !== undefined && (
            <ScoreBar
              label="Nice-to-have skills"
              score={niceToHave}
              detail={`${match.matchedNiceToHave.length} of ${match.matchedNiceToHave.length + match.missingNiceToHave.length} found in your resume`}
            />
          )}
          <ScoreBar label="ATS check" score={match.ats.score} detail="Rule-based resume quality checks" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle>Skills match</SectionTitle>
            <p className="flex gap-3 text-xs font-medium text-stone-600">
              <span className="inline-flex items-center gap-1">
                <span aria-hidden="true" className="size-2 rounded-full bg-green-500" />
                Matched ({matchedCount})
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden="true" className="size-2 rounded-full bg-red-500" />
                Missing ({missingCount})
              </span>
            </p>
          </div>
          {skills.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {skills.map(({ skill, matched, nice }, index) => (
                <li key={`${skill}-${index}`} className="flex items-center gap-2 text-sm text-stone-800">
                  {matched ? (
                    <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-green-600" />
                  ) : (
                    <CircleX aria-hidden="true" className="size-4 shrink-0 text-red-600" />
                  )}
                  <span className="min-w-0 break-words">{skill}</span>
                  <span className="sr-only">{matched ? "matched" : "missing"}</span>
                  {nice && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                      nice-to-have
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">The job description did not list specific skills.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <SectionTitle>Missing skills</SectionTitle>
          {missingCount === 0 ? (
            <p className="flex items-center gap-2 text-sm text-green-800">
              <CircleCheck aria-hidden="true" className="size-4" />
              Your resume covers every listed skill.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["Must-have", match.missingMustHave],
                  ["Nice-to-have", match.missingNiceToHave],
                ] as const
              ).map(([title, list]) => (
                <div key={title} className="space-y-2">
                  <p className="text-sm font-medium text-stone-700">
                    {title} ({list.length})
                  </p>
                  {list.length ? (
                    <ul className="space-y-1.5">
                      {list.map((skill) => (
                        <li key={skill} className="flex items-center gap-2 text-sm text-stone-900">
                          <Plus aria-hidden="true" className="size-4 text-indigo-700" />
                          {skill}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-stone-500">None.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <SectionTitle>Keyword check</SectionTitle>
          {keywordCheck ? (
            <p className="flex gap-2 text-sm text-stone-700">
              {keywordCheck.status === "pass" ? (
                <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-green-600" />
              ) : (
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600" />
              )}
              {keywordCheck.detail}
            </p>
          ) : (
            <p className="text-sm text-stone-600">
              Keyword coverage is part of the ATS check.
            </p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => props.onShowTab("ats")}>
            See all ATS checks
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="space-y-3">
          <SectionTitle>Resume improvements</SectionTitle>
          {match.suggestions.length ? (
            <ol className="grid gap-3 md:grid-cols-2">
              {match.suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.title}-${index}`}
                  className="flex gap-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-700 ring-1 ring-stone-200"
                >
                  <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span>
                    <span className="font-semibold text-stone-900">{suggestion.title}</span>
                    {`: ${suggestion.detail}`}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-stone-500">No suggestions were returned.</p>
          )}
          {suggestionsError && (
            <div className="space-y-2">
              <p className="text-sm text-stone-600" role="status">
                {suggestionsError}
              </p>
              {onRetrySuggestions && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isMatching || retryCountdown > 0}
                  onClick={onRetrySuggestions}
                >
                  Try again
                </Button>
              )}
              {retryCountdown > 0 && (
                <p className="text-sm text-stone-600" role="status">
                  Try again in {retryCountdown} seconds.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(onRewrite || onDownload || onBuildResume || extraActions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start lg:col-span-2">
          {onRewrite && (
            <Button type="button" disabled={isRewriting || isMatching} onClick={onRewrite}>
              <Sparkles aria-hidden="true" />
              {isRewriting ? "Improving bullets…" : "Improve bullets"}
            </Button>
          )}
          {onDownload && (
            <Button type="button" variant="outline" onClick={onDownload}>
              <FileDown aria-hidden="true" />
              Download report
            </Button>
          )}
          {onBuildResume && (
            <Button type="button" variant="outline" onClick={onBuildResume}>
              Build tailored resume
            </Button>
          )}
          {extraActions}
        </div>
      )}
      {isRewriting && (
        <p className="text-sm text-indigo-700 lg:col-span-2" role="status">
          Rewriting project bullets…
        </p>
      )}
      {matchError && (
        <div className="space-y-2 lg:col-span-2">
          <p className="text-sm text-red-600" role="alert">{matchError}</p>
          {onRetryMatch && (
            <Button
              type="button"
              variant="outline"
              disabled={isMatching || retryCountdown > 0}
              onClick={onRetryMatch}
            >
              Try again
            </Button>
          )}
          {retryCountdown > 0 && (
            <p className="text-sm text-stone-600" role="status">
              Try again in {retryCountdown} seconds.
            </p>
          )}
        </div>
      )}
      {rewriteError && (
        <p className="text-sm text-red-600 lg:col-span-2" role="alert">{rewriteError}</p>
      )}
    </div>
  );
}

function SkillsPanel({ resume, job, match }: AnalysisCardsProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Your match</CardTitle>
          <CardDescription>Skills from the job compared with your resume.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2"><SectionTitle>Matched must-have skills</SectionTitle><SkillChips skills={match.matchedMustHave} status="matched" /></div>
          <div className="space-y-2"><SectionTitle>Missing must-have skills</SectionTitle><SkillChips skills={match.missingMustHave} status="missing" /></div>
          <div className="space-y-2"><SectionTitle>Matched nice-to-have skills</SectionTitle><SkillChips skills={match.matchedNiceToHave} status="matched" /></div>
          <div className="space-y-2"><SectionTitle>Missing nice-to-have skills</SectionTitle><SkillChips skills={match.missingNiceToHave} status="missing" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Skills listed</CardTitle>
          <CardDescription>
            {job.jobTitle ?? "Job title not specified"}
            {job.company ? ` · ${job.company}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {job.yearsOfExperience !== null && (
            <p className="text-sm text-stone-700">Experience: {job.yearsOfExperience} years</p>
          )}
          <div className="space-y-2"><SectionTitle>Must-have skills</SectionTitle><SkillChips skills={job.mustHaveSkills} /></div>
          <div className="space-y-2"><SectionTitle>Nice-to-have skills</SectionTitle><SkillChips skills={job.niceToHaveSkills} /></div>
          <div className="space-y-2"><SectionTitle>Skills on your resume</SectionTitle><SkillChips skills={resume.skills} /></div>
        </CardContent>
      </Card>
    </div>
  );
}

function BulletsPanel({
  rewrites,
  isRewriting = false,
  isMatching = false,
  rewriteError,
  copiedBullet,
  onRewrite,
  onCopy,
  onBuildResume,
  bulletChoices,
  onBulletChoice,
}: AnalysisCardsProps) {
  if (!rewrites) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3">
          <SectionTitle>Rewritten bullet points</SectionTitle>
          <p className="text-sm text-stone-600">
            {onRewrite
              ? "Rewrite your project bullets for this job. Every rewrite is checked so it never adds numbers, skills or tools that aren't in your resume."
              : "No bullet rewrites were saved with this analysis."}
          </p>
          {onRewrite && (
            <Button type="button" disabled={isRewriting || isMatching} onClick={onRewrite}>
              <Sparkles aria-hidden="true" />
              {isRewriting ? "Improving bullets…" : "Improve bullets"}
            </Button>
          )}
          {isRewriting && <p className="text-sm text-indigo-700" role="status">Rewriting project bullets…</p>}
          {rewriteError && <p className="text-sm text-red-600" role="alert">{rewriteError}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Improved bullets</CardTitle>
        <CardDescription>
          Rewrites preserve each project bullet&apos;s facts and technologies.
          {onBulletChoice && " Accept or reject each one; your choices are used when you build a tailored resume."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {rewrites.length ? rewrites.map((project) => (
          <section key={project.projectName} className="space-y-3">
            <SectionTitle>{project.projectName}</SectionTitle>
            <ul className="space-y-3">
              {project.rewrites.map((rewrite, index) => {
                const id = bulletId(project.projectName, index);
                const changed = rewrite.original !== rewrite.rewritten;
                const choice = bulletChoices?.[id];
                return (
                  <li key={id} className="grid gap-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200 md:grid-cols-[1fr_1fr_auto] md:items-start">
                    <div className="rounded-lg bg-white p-3 ring-1 ring-stone-200">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Before</p>
                      <p className={`mt-1 text-sm ${changed ? "text-stone-600" : "text-stone-800"}`}>{rewrite.original}</p>
                    </div>
                    <div className={`rounded-lg p-3 ring-1 ${changed ? "bg-green-50 ring-green-200" : "bg-white ring-stone-200"}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
                        {changed ? "After" : "Kept as is"}
                      </p>
                      <p className="mt-1 text-sm text-stone-900">{rewrite.rewritten}</p>
                      <p className="mt-2 text-xs text-stone-600">{rewrite.reason}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:flex-col">
                      {onCopy && (
                        <Button type="button" size="sm" variant="outline" onClick={() => onCopy(id, rewrite.rewritten)}>
                          {copiedBullet === id ? "Copied" : "Copy"}
                        </Button>
                      )}
                      {onBulletChoice && changed && (
                        <div role="group" aria-label={`Rewrite ${index + 1} for ${project.projectName}`} className="flex gap-2 md:flex-col">
                          <Button
                            type="button"
                            size="sm"
                            variant={choice === "rejected" ? "destructive" : "outline"}
                            aria-pressed={choice === "rejected"}
                            onClick={() => onBulletChoice(id, choice === "rejected" ? undefined : "rejected")}
                          >
                            Reject
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={choice === "rejected" ? "outline" : "default"}
                            aria-pressed={choice !== "rejected"}
                            onClick={() => onBulletChoice(id, "accepted")}
                          >
                            Accept
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )) : <p className="text-sm text-stone-500">No project bullets are available to improve.</p>}
        {(onBuildResume || onRewrite) && (
          <div className="flex flex-wrap gap-3">
            {onBuildResume && (
              <Button type="button" onClick={onBuildResume}>
                Build tailored resume
              </Button>
            )}
            {onRewrite && (
              <Button type="button" variant="outline" disabled={isRewriting || isMatching} onClick={onRewrite}>
                {isRewriting ? "Improving bullets…" : "Rewrite again"}
              </Button>
            )}
          </div>
        )}
        {isRewriting && <p className="text-sm text-indigo-700" role="status">Rewriting project bullets…</p>}
        {rewriteError && <p className="text-sm text-red-600" role="alert">{rewriteError}</p>}
      </CardContent>
    </Card>
  );
}

function DetailsPanel({ resume, job }: AnalysisCardsProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle>Your resume</CardTitle>
          <CardDescription>{resume.name ?? "Resume"}{resume.email ? ` · ${resume.email}` : ""}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {resume.summary && <p className="text-sm leading-6 text-stone-700">{resume.summary}</p>}
          <div className="space-y-2"><SectionTitle>Skills</SectionTitle><SkillChips skills={resume.skills} /></div>
          <div className="space-y-3">
            <SectionTitle>Experience</SectionTitle>
            {resume.experience.length ? <ul className="space-y-4">{resume.experience.map((entry, index) => (
              <li key={`${entry.role ?? "role"}-${index}`} className="space-y-1 border-l-2 border-indigo-200 pl-4">
                <p className="font-medium">{[entry.role, entry.company].filter(Boolean).join(" · ") || "Experience"}</p>
                {(entry.startDate || entry.endDate) && <p className="text-sm text-stone-500">{[entry.startDate, entry.endDate].filter(Boolean).join(" – ")}</p>}
                <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">{entry.bullets.map((bullet, bulletIndex) => <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>)}</ul>
              </li>
            ))}</ul> : <p className="text-sm text-stone-500">No experience entries were found.</p>}
          </div>
          <div className="space-y-3">
            <SectionTitle>Projects</SectionTitle>
            {resume.projects.length ? <ul className="space-y-4">{resume.projects.map((project, index) => (
              <li key={`${project.name ?? "project"}-${index}`} className="space-y-2 border-l-2 border-indigo-200 pl-4">
                <p className="font-medium">{project.name ?? "Project"}</p>
                {project.description && <p className="text-sm text-stone-700">{project.description}</p>}
                {project.techStack.length > 0 && <SkillChips skills={project.techStack} />}
                {project.bullets.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">{project.bullets.map((bullet, bulletIndex) => <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>)}</ul>}
              </li>
            ))}</ul> : <p className="text-sm text-stone-500">No projects were found.</p>}
          </div>
          {resume.education.length > 0 && <div className="space-y-3"><SectionTitle>Education</SectionTitle><ul className="space-y-2">{resume.education.map((entry, index) => <li key={`${entry.institution ?? "education"}-${index}`} className="text-sm text-stone-700">{[entry.degree, entry.institution, entry.year].filter(Boolean).join(" · ")}</li>)}</ul></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Job requirements</CardTitle><CardDescription>{job.jobTitle ?? "Job title not specified"}{job.company ? ` · ${job.company}` : ""}</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          {job.yearsOfExperience !== null && <p className="text-sm text-stone-700">Experience: {job.yearsOfExperience} years</p>}
          <div className="space-y-2"><SectionTitle>Must-have skills</SectionTitle><SkillChips skills={job.mustHaveSkills} /></div>
          <div className="space-y-2"><SectionTitle>Nice-to-have skills</SectionTitle><SkillChips skills={job.niceToHaveSkills} /></div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Read-only cover letter and interview prep tabs for saved analyses. */
export function savedExtraTabs(coverLetter?: string, interviewPrep?: InterviewPrepResult): ResultsTab[] {
  const tabs: ResultsTab[] = [];
  if (coverLetter) {
    tabs.push({
      id: "cover-letter",
      label: "Cover letter",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Cover letter</CardTitle>
            <CardDescription>Saved with this analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{coverLetter}</p>
          </CardContent>
        </Card>
      ),
    });
  }
  if (interviewPrep) {
    tabs.push({
      id: "interview",
      label: "Interview prep",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Interview prep</CardTitle>
            <CardDescription>Read-only interview questions and resume-based answer outlines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <InterviewWarnings warnings={interviewPrep.warnings} />
            {INTERVIEW_CATEGORIES.map(([category, title]) => {
              const questions = interviewPrep.questions.filter((question) => question.category === category);
              if (!questions.length) return null;
              return (
                <section key={category} className="space-y-3">
                  <SectionTitle>{title}</SectionTitle>
                  <ul className="space-y-3">
                    {questions.map((question, index) => (
                      <li key={`${question.question}-${index}`}>
                        <details className="rounded-xl border border-stone-200 bg-white p-3">
                          <summary className="cursor-pointer font-medium">{question.question}</summary>
                          <div className="mt-3 space-y-2 text-sm">
                            <p><span className="font-medium">Why they ask:</span> {question.whyAsked}</p>
                            {question.basedOn && (
                              <p className="inline-flex rounded-full bg-cyan-100 px-2.5 py-1 font-medium text-cyan-950">
                                Based on: {question.basedOn}
                              </p>
                            )}
                            <ul className="list-disc space-y-1 pl-5">
                              {question.answerOutline.map((bullet, bulletIndex) => (
                                <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>
                              ))}
                            </ul>
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </CardContent>
        </Card>
      ),
    });
  }
  return tabs;
}

export const INTERVIEW_CATEGORIES = [
  ["technical", "Technical"],
  ["gap", "Skill gaps"],
  ["project", "Your projects"],
  ["behavioral", "Behavioral"],
] as const;

export function InterviewWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-xl bg-stone-100 p-3 text-sm text-stone-700" role="status">
      <p className="font-medium">Accuracy notes</p>
      <ul className="mt-1 list-disc pl-5">
        {warnings.map((warning, index) => (
          <li key={`${warning}-${index}`}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

export function AnalysisCards(props: AnalysisCardsProps) {
  const { job, match, subtitle, tab, onTabChange, extraTabs = [] } = props;
  const [ownTab, setOwnTab] = useState("overview");
  const baseId = useId();
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  function showTab(next: string) {
    if (onTabChange) onTabChange(next);
    else setOwnTab(next);
  }

  const tabs: ResultsTab[] = [
    { id: "overview", label: "Overview", content: <OverviewPanel {...props} onShowTab={showTab} /> },
    { id: "skills", label: "Skills", content: <SkillsPanel {...props} /> },
    { id: "bullets", label: "Bullets", content: <BulletsPanel {...props} /> },
    { id: "ats", label: "ATS check", content: <Card><AtsCheckCard ats={match.ats} /></Card> },
    { id: "details", label: "Resume & job", content: <DetailsPanel {...props} /> },
    ...extraTabs,
  ];
  const requested = tab ?? ownTab;
  const active = tabs.find((entry) => entry.id === requested) ?? tabs[0];

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((entry) => entry.id === active.id);
    const nextIndex =
      event.key === "ArrowRight" ? (index + 1) % tabs.length
        : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home" ? 0
            : event.key === "End" ? tabs.length - 1
              : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const next = tabs[nextIndex].id;
    showTab(next);
    tabRefs.current.get(next)?.focus();
  }

  return (
    <section aria-label="Analysis results" className="grid min-w-0 gap-5">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="break-words text-xl font-bold text-stone-900">
              {job.jobTitle ?? "Untitled job"}
              {job.company ? `, ${job.company}` : ""}
            </p>
            {subtitle && <p className="text-sm text-stone-600">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 py-2 pl-4 pr-2">
            <div>
              <p className="text-xs font-medium text-indigo-900">Overall match</p>
              <p className="text-2xl font-bold text-indigo-950">{match.score}%</p>
            </div>
            <ScoreRing score={match.score} label="Resume match score" size={60} />
          </div>
        </CardContent>
      </Card>

      <div
        role="tablist"
        aria-label="Result sections"
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-stone-200"
      >
        {tabs.map((entry) => {
          const selected = entry.id === active.id;
          return (
            <button
              key={entry.id}
              ref={(element) => {
                if (element) tabRefs.current.set(entry.id, element);
                else tabRefs.current.delete(entry.id);
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${entry.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => showTab(entry.id)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                selected
                  ? "border-indigo-600 text-indigo-800"
                  : "border-transparent text-stone-600 hover:text-stone-900"
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        className="min-w-0"
      >
        {active.content}
      </div>
    </section>
  );
}

export function AtsCheckCard({ ats }: { ats: MatchResult["ats"] }) {
  const tip = ats.checks.find((check) => check.status !== "pass");
  return (
    <>
      <CardHeader>
        <CardTitle>Resume quality checks</CardTitle>
        <CardDescription>Rule-based checks for common applicant tracking system requirements.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[auto_1fr_minmax(0,16rem)] md:items-start">
        <div className="flex flex-col items-center gap-2 text-center">
          <ScoreRing score={ats.score} label="ATS score" size={112} />
          <p className="text-sm font-semibold text-stone-900">ATS score: {ats.score}/100</p>
        </div>
        <ul className="space-y-3">
          {ats.checks.map((check) => {
            const visual = {
              pass: { Icon: CircleCheck, color: "text-green-700", label: "Pass" },
              warn: { Icon: CircleAlert, color: "text-amber-700", label: "Warning" },
              fail: { Icon: CircleX, color: "text-red-700", label: "Fail" },
            }[check.status];
            return (
              <li key={check.id} className="flex gap-3 text-sm">
                <visual.Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${visual.color}`} />
                <div><p className={`font-medium ${visual.color}`}>{check.label}: {visual.label}</p><p className="text-stone-600">{check.detail}</p></div>
              </li>
            );
          })}
        </ul>
        <aside className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950">
          <Lightbulb aria-hidden="true" className="mb-2 size-5 text-indigo-700" />
          <p className="font-semibold">Tip</p>
          <p className="mt-1">
            {tip
              ? `Start with "${tip.label}": ${tip.detail}`
              : "Use action verbs like “built”, “developed” and “created” instead of “worked on”."}
          </p>
        </aside>
      </CardContent>
    </>
  );
}
