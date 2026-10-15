"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  JobRequirements,
  MatchResult,
  ProjectBulletRewrites,
  Resume,
} from "@/lib/schemas";

interface AnalysisCardsProps {
  resume: Resume;
  job: JobRequirements;
  match: MatchResult;
  rewrites?: ProjectBulletRewrites[];
  isMatching?: boolean;
  isRewriting?: boolean;
  matchError?: string;
  rewriteError?: string;
  copiedBullet?: string;
  onRewrite?: () => void;
  onDownload?: () => void;
  onCopy?: (id: string, content: string) => void;
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
      ? "bg-green-50 text-green-800"
      : status === "missing"
        ? "bg-red-50 text-red-800"
        : "bg-indigo-50 text-indigo-800";

  return (
    <ul className="flex flex-wrap gap-2">
      {skills.map((skill, index) => (
        <li key={`${skill}-${index}`} className={`rounded-full px-3 py-1 text-sm ${color}`}>
          {skill}
        </li>
      ))}
    </ul>
  );
}

export function AnalysisCards({
  resume,
  job,
  match,
  rewrites,
  isMatching = false,
  isRewriting = false,
  matchError,
  rewriteError,
  copiedBullet,
  onRewrite,
  onDownload,
  onCopy,
}: AnalysisCardsProps) {
  return (
    <section aria-label="Analysis results" className="grid min-w-0 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Match analysis</CardTitle>
          <CardDescription>
            Deterministic skill and experience match with tailored suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isMatching && (
            <p className="text-sm text-indigo-700" role="status">
              Calculating your match and generating suggestions…
            </p>
          )}
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-5xl font-semibold tracking-tight text-stone-900">
                {match.score}<span className="text-2xl text-stone-500">/100</span>
              </p>
              <p className="text-lg font-medium text-indigo-800">{match.label}</p>
            </div>
            <div
              role="progressbar"
              aria-label="Resume match score"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={match.score}
              className="h-3 overflow-hidden rounded-full bg-stone-200"
            >
              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${match.score}%` }} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><h3 className="font-medium">Matched must-have skills</h3><SkillChips skills={match.matchedMustHave} status="matched" /></div>
            <div className="space-y-2"><h3 className="font-medium">Missing must-have skills</h3><SkillChips skills={match.missingMustHave} status="missing" /></div>
            <div className="space-y-2"><h3 className="font-medium">Matched nice-to-have skills</h3><SkillChips skills={match.matchedNiceToHave} status="matched" /></div>
            <div className="space-y-2"><h3 className="font-medium">Missing nice-to-have skills</h3><SkillChips skills={match.missingNiceToHave} status="missing" /></div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Resume improvements</h3>
            {match.suggestions.length ? (
              <ol className="list-decimal space-y-3 pl-5 text-sm text-stone-700">
                {match.suggestions.map((suggestion, index) => (
                  <li key={`${suggestion.title}-${index}`}><span className="font-medium text-stone-900">{suggestion.title}</span>{`: ${suggestion.detail}`}</li>
                ))}
              </ol>
            ) : <p className="text-sm text-stone-500">No suggestions were returned.</p>}
          </div>

          {(onRewrite || onDownload) && (
            <div className="flex flex-col gap-3 sm:flex-row">
              {onRewrite && <Button type="button" disabled={isRewriting} onClick={onRewrite}>{isRewriting ? "Improving bullets…" : "Improve bullets"}</Button>}
              {onDownload && <Button type="button" variant="outline" onClick={onDownload}>Download report</Button>}
            </div>
          )}
          {isRewriting && <p className="text-sm text-indigo-700" role="status">Rewriting project bullets…</p>}
          {matchError && <p className="text-sm text-red-600" role="alert">{matchError}</p>}
          {rewriteError && <p className="text-sm text-red-600" role="alert">{rewriteError}</p>}
        </CardContent>
      </Card>

      <Card>
        <AtsCheckCard ats={match.ats} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your resume</CardTitle>
          <CardDescription>{resume.name ?? "Resume"}{resume.email ? ` · ${resume.email}` : ""}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {resume.summary && <p className="text-sm leading-6 text-stone-700">{resume.summary}</p>}
          <div className="space-y-2"><h3 className="font-medium">Skills</h3><SkillChips skills={resume.skills} /></div>
          <div className="space-y-3">
            <h3 className="font-medium">Experience</h3>
            {resume.experience.length ? <ul className="space-y-4">{resume.experience.map((entry, index) => (
              <li key={`${entry.role ?? "role"}-${index}`} className="space-y-1 border-l-2 border-indigo-200 pl-4">
                <p className="font-medium">{[entry.role, entry.company].filter(Boolean).join(" · ") || "Experience"}</p>
                {(entry.startDate || entry.endDate) && <p className="text-sm text-stone-500">{[entry.startDate, entry.endDate].filter(Boolean).join(" – ")}</p>}
                <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">{entry.bullets.map((bullet, bulletIndex) => <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>)}</ul>
              </li>
            ))}</ul> : <p className="text-sm text-stone-500">No experience entries were found.</p>}
          </div>
          <div className="space-y-3">
            <h3 className="font-medium">Projects</h3>
            {resume.projects.length ? <ul className="space-y-4">{resume.projects.map((project, index) => (
              <li key={`${project.name ?? "project"}-${index}`} className="space-y-2 border-l-2 border-indigo-200 pl-4">
                <p className="font-medium">{project.name ?? "Project"}</p>
                {project.description && <p className="text-sm text-stone-700">{project.description}</p>}
                {project.techStack.length > 0 && <SkillChips skills={project.techStack} />}
                {project.bullets.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">{project.bullets.map((bullet, bulletIndex) => <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>)}</ul>}
              </li>
            ))}</ul> : <p className="text-sm text-stone-500">No projects were found.</p>}
          </div>
          {resume.education.length > 0 && <div className="space-y-3"><h3 className="font-medium">Education</h3><ul className="space-y-2">{resume.education.map((entry, index) => <li key={`${entry.institution ?? "education"}-${index}`} className="text-sm text-stone-700">{[entry.degree, entry.institution, entry.year].filter(Boolean).join(" · ")}</li>)}</ul></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Job requirements</CardTitle><CardDescription>{job.jobTitle ?? "Job title not specified"}{job.company ? ` · ${job.company}` : ""}</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          {job.yearsOfExperience !== null && <p className="text-sm text-stone-700">Experience: {job.yearsOfExperience} years</p>}
          <div className="space-y-2"><h3 className="font-medium">Must-have skills</h3><SkillChips skills={job.mustHaveSkills} /></div>
          <div className="space-y-2"><h3 className="font-medium">Nice-to-have skills</h3><SkillChips skills={job.niceToHaveSkills} /></div>
        </CardContent>
      </Card>

      {rewrites && <Card>
        <CardHeader><CardTitle>Improved bullets</CardTitle><CardDescription>Rewrites preserve each project bullet&apos;s facts and technologies.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          {rewrites.length ? rewrites.map((project) => <section key={project.projectName} className="space-y-3">
            <h3 className="font-medium">{project.projectName}</h3>
            <ul className="space-y-4">{project.rewrites.map((rewrite, index) => {
              const id = `${project.projectName}-${index}`;
              const changed = rewrite.original !== rewrite.rewritten;
              return <li key={id} className="space-y-1 border-l-2 border-indigo-200 pl-4">
                <p className={`text-sm ${changed ? "text-stone-500 line-through" : "text-stone-700"}`}>{rewrite.original}</p>
                <p className="text-sm text-stone-900">{rewrite.rewritten}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-stone-500">{rewrite.reason}</p>
                  {onCopy && <Button type="button" size="sm" variant="outline" onClick={() => onCopy(id, rewrite.rewritten)}>{copiedBullet === id ? "Copied" : "Copy"}</Button>}
                </div>
              </li>;
            })}</ul>
          </section>) : <p className="text-sm text-stone-500">No project bullets are available to improve.</p>}
        </CardContent>
      </Card>}
    </section>
  );
}

export function AtsCheckCard({ ats }: { ats: MatchResult["ats"] }) {
  return (
    <>
      <CardHeader><CardTitle>ATS check</CardTitle><CardDescription>Rule-based checks for common applicant tracking system requirements.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-3xl font-semibold text-stone-900">ATS score: {ats.score}/100</p>
        <ul className="space-y-3">
          {ats.checks.map((check) => {
            const visual = {
              pass: { icon: "✓", color: "text-green-700", label: "Pass" },
              warn: { icon: "!", color: "text-amber-700", label: "Warning" },
              fail: { icon: "✗", color: "text-red-700", label: "Fail" },
            }[check.status];
            return (
              <li key={check.id} className="flex gap-3 text-sm">
                <span aria-hidden="true" className={`font-bold ${visual.color}`}>{visual.icon}</span>
                <div><p className={`font-medium ${visual.color}`}>{check.label}: {visual.label}</p><p className="text-stone-600">{check.detail}</p></div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </>
  );
}
