"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  bulletText,
  countImprovedBullets,
  displayedSkills,
  draftToPlainText,
  loadResumeDraft,
  moveItem,
  resumeFileName,
  saveResumeDraft,
  type DraftBullet,
  type ResumeDraft,
} from "@/lib/resumeBuilder";

const NAV_LINK =
  "rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600";
const EDITABLE =
  "w-full min-w-0 rounded-sm bg-transparent px-1 text-stone-900 hover:bg-indigo-50/60 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 print:hover:bg-transparent";
const EDITABLE_AREA = `${EDITABLE} resize-none field-sizing-content`;
const SECTION_TITLE =
  "border-b border-stone-300 pb-1 text-sm font-semibold uppercase tracking-wider text-stone-900";

/** Plain text used only when printing, so the PDF has a clean text layer for ATS parsers. */
function PrintText({ className, children }: { className: string; children: string }) {
  if (!children.trim()) return null;
  return <p className={`hidden whitespace-pre-wrap px-1 text-stone-900 print:block ${className}`}>{children}</p>;
}

function BulletEditor({
  bullet,
  label,
  onChange,
}: {
  bullet: DraftBullet;
  label: string;
  onChange: (bullet: DraftBullet) => void;
}) {
  return (
    <li className="space-y-1">
      <div className="flex items-start gap-1">
        <span aria-hidden="true" className="pt-0.5 text-stone-900 print:hidden">
          •
        </span>
        <textarea
          aria-label={label}
          rows={1}
          className={`${EDITABLE_AREA} text-sm leading-6 print:hidden`}
          value={bulletText(bullet)}
          onChange={(event) => onChange({ ...bullet, edited: event.target.value })}
        />
        <PrintText className="pl-4 -indent-4 text-sm leading-6">{`• ${bulletText(bullet)}`}</PrintText>
      </div>
      {(bullet.improved || bullet.edited !== null) && (
        <div className="flex flex-wrap items-center gap-2 pl-4 print:hidden">
          {bullet.improved && (
            <div role="group" aria-label={`Wording for ${label}`} className="inline-flex rounded-md ring-1 ring-stone-300">
              {(["Original", "Improved"] as const).map((option) => {
                const pressed =
                  bullet.edited === null && bullet.useImproved === (option === "Improved");
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() =>
                      onChange({ ...bullet, useImproved: option === "Improved", edited: null })
                    }
                    className={`px-2 py-1 text-xs font-medium first:rounded-l-md last:rounded-r-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                      pressed ? "bg-indigo-700 text-white" : "bg-white text-stone-800 hover:bg-stone-100"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}
          {bullet.edited !== null && (
            <>
              <span className="text-xs text-stone-700">Edited</span>
              <button
                type="button"
                onClick={() => onChange({ ...bullet, edited: null })}
                className="rounded-sm text-xs font-medium text-indigo-800 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Undo edit
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export default function ResumeBuilderPage() {
  const [draft, setDraft] = useState<ResumeDraft>();
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDraft(loadResumeDraft());
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function update(next: ResumeDraft) {
    setDraft(next);
    saveResumeDraft(next);
    setNotice(undefined);
  }

  function updateProjectBullet(projectIndex: number, bulletIndex: number, bullet: DraftBullet) {
    if (!draft) return;
    update({
      ...draft,
      projects: draft.projects.map((project, index) =>
        index === projectIndex
          ? {
              ...project,
              bullets: project.bullets.map((item, itemIndex) =>
                itemIndex === bulletIndex ? bullet : item,
              ),
            }
          : project,
      ),
    });
  }

  function updateExperienceBullet(entryIndex: number, bulletIndex: number, bullet: DraftBullet) {
    if (!draft) return;
    update({
      ...draft,
      experience: draft.experience.map((entry, index) =>
        index === entryIndex
          ? {
              ...entry,
              bullets: entry.bullets.map((item, itemIndex) =>
                itemIndex === bulletIndex ? bullet : item,
              ),
            }
          : entry,
      ),
    });
  }

  async function copyText() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draftToPlainText(draft));
      setNotice("Resume text copied.");
    } catch {
      setNotice("Could not copy. Use Download .txt instead.");
    }
  }

  function downloadText() {
    if (!draft) return;
    const blob = new Blob([draftToPlainText(draft)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = resumeFileName(draft);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const improved = draft ? countImprovedBullets(draft) : undefined;
  const skills = draft ? displayedSkills(draft) : [];

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6 sm:py-12 print:bg-white print:p-0">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 print:max-w-none print:gap-0">
        <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <Link href="/" aria-label="ResuFit" className="mb-2 inline-flex">
              <Logo />
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Tailored resume</h1>
            <p className="mt-2 text-stone-600">
              {draft?.jobTitle
                ? `For ${draft.jobTitle}${draft.company ? ` at ${draft.company}` : ""}.`
                : "Built from your resume and the improvements you approved."}
            </p>
          </div>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-2">
            <Link href="/analyze" className={NAV_LINK}>
              Analyze a resume
            </Link>
            <Link href="/tracker" className={NAV_LINK}>
              Tracker
            </Link>
          </nav>
        </header>

        {isLoading ? (
          <p className="text-sm text-stone-600" role="status">
            Loading your resume…
          </p>
        ) : !draft ? (
          <div className="rounded-xl bg-white p-8 text-center ring-1 ring-foreground/10">
            <h2 className="text-lg font-medium text-stone-900">Analyze a resume first</h2>
            <p className="mt-2 text-stone-600">
              Run an analysis, then choose Build tailored resume to assemble it here.
            </p>
            <Link
              href="/analyze"
              className="mt-5 inline-flex rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
            >
              Analyze a resume
            </Link>
          </div>
        ) : (
          <>
            <section aria-label="Resume options" className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-foreground/10 print:hidden">
              <p className="text-sm text-stone-700">
                Everything here comes from your resume and the rewrites that passed ResuFit&apos;s
                honesty checks. Click any text to edit it, and review it before you send it.
              </p>
              {improved && improved.available > 0 && (
                <p className="text-sm text-stone-800" role="status">
                  Using {improved.used} of {improved.available} improved{" "}
                  {improved.available === 1 ? "bullet" : "bullets"}.
                </p>
              )}
              <label className="flex items-center gap-2 text-sm text-stone-800">
                <input
                  type="checkbox"
                  checked={draft.matchingSkillsFirst}
                  onChange={(event) => update({ ...draft, matchingSkillsFirst: event.target.checked })}
                />
                Put skills that match the job first
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => window.print()}>
                  Save as PDF
                </Button>
                <Button type="button" variant="outline" onClick={() => void copyText()}>
                  Copy text
                </Button>
                <Button type="button" variant="outline" onClick={downloadText}>
                  Download .txt
                </Button>
              </div>
              {notice && (
                <p className="text-sm text-stone-800" role="status">
                  {notice}
                </p>
              )}
              <p className="text-xs text-stone-600">
                In the print dialog, choose &quot;Save as PDF&quot; as the destination and turn off
                headers and footers.
              </p>
            </section>

            <article
              aria-label="Resume preview"
              className="space-y-5 rounded-xl bg-white p-6 ring-1 ring-foreground/10 sm:p-10 print:rounded-none print:p-0 print:ring-0"
            >
              <div className="space-y-1 text-center">
                <input
                  aria-label="Name"
                  className={`${EDITABLE} text-center text-2xl font-semibold print:hidden`}
                  value={draft.name}
                  placeholder="Your name"
                  onChange={(event) => update({ ...draft, name: event.target.value })}
                />
                <PrintText className="text-center text-2xl font-semibold">{draft.name}</PrintText>
                <input
                  aria-label="Contact details"
                  className={`${EDITABLE} text-center text-sm print:hidden`}
                  value={draft.contact}
                  placeholder="Email · phone · LinkedIn · GitHub"
                  onChange={(event) => update({ ...draft, contact: event.target.value })}
                />
                <PrintText className="text-center text-sm">{draft.contact}</PrintText>
              </div>

              <section aria-labelledby="summary-title" className={`space-y-2 ${draft.summary ? "" : "print:hidden"}`}>
                  <h2 id="summary-title" className={SECTION_TITLE}>
                    Summary
                  </h2>
                  <PrintText className="text-sm leading-6">{draft.summary}</PrintText>
                  <textarea
                    aria-label="Summary"
                    rows={2}
                    className={`${EDITABLE_AREA} text-sm leading-6 print:hidden`}
                    value={draft.summary}
                    placeholder="Optional: two lines about you, using only facts from your resume."
                    onChange={(event) => update({ ...draft, summary: event.target.value })}
                  />
                </section>

              {skills.length > 0 && (
                <section aria-labelledby="skills-title" className="space-y-2">
                  <h2 id="skills-title" className={SECTION_TITLE}>
                    Skills
                  </h2>
                  <p className="text-sm leading-6 text-stone-900">{skills.join(", ")}</p>
                </section>
              )}

              {draft.projects.length > 0 && (
                <section aria-labelledby="projects-title" className="space-y-4">
                  <h2 id="projects-title" className={SECTION_TITLE}>
                    Projects
                  </h2>
                  {draft.projects.map((project, projectIndex) => (
                    <div key={project.id} className="space-y-1 break-inside-avoid">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <PrintText className="text-sm font-semibold">{project.name}</PrintText>
                          <input
                            aria-label={`Project name ${projectIndex + 1}`}
                            className={`${EDITABLE} text-sm font-semibold print:hidden`}
                            value={project.name}
                            onChange={(event) =>
                              update({
                                ...draft,
                                projects: draft.projects.map((item, index) =>
                                  index === projectIndex ? { ...item, name: event.target.value } : item,
                                ),
                              })
                            }
                          />
                          {project.techStack.length > 0 && (
                            <p className="px-1 text-xs text-stone-700">
                              {project.techStack.join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1 print:hidden">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={projectIndex === 0}
                            aria-label={`Move ${project.name || "project"} up`}
                            onClick={() => update({ ...draft, projects: moveItem(draft.projects, projectIndex, -1) })}
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={projectIndex === draft.projects.length - 1}
                            aria-label={`Move ${project.name || "project"} down`}
                            onClick={() => update({ ...draft, projects: moveItem(draft.projects, projectIndex, 1) })}
                          >
                            ↓
                          </Button>
                        </div>
                      </div>
                      <ul className="space-y-1">
                        {project.bullets.map((bullet, bulletIndex) => (
                          <BulletEditor
                            key={bullet.id}
                            bullet={bullet}
                            label={`${project.name || "Project"} bullet ${bulletIndex + 1}`}
                            onChange={(next) => updateProjectBullet(projectIndex, bulletIndex, next)}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}

              {draft.experience.length > 0 && (
                <section aria-labelledby="experience-title" className="space-y-4">
                  <h2 id="experience-title" className={SECTION_TITLE}>
                    Experience
                  </h2>
                  {draft.experience.map((entry, entryIndex) => (
                    <div key={entry.id} className="space-y-1 break-inside-avoid">
                      <p className="flex flex-wrap justify-between gap-x-4 px-1 text-sm">
                        <span className="font-semibold text-stone-900">{entry.heading}</span>
                        {entry.dates && <span className="text-stone-700">{entry.dates}</span>}
                      </p>
                      <ul className="space-y-1">
                        {entry.bullets.map((bullet, bulletIndex) => (
                          <BulletEditor
                            key={bullet.id}
                            bullet={bullet}
                            label={`${entry.heading || "Experience"} bullet ${bulletIndex + 1}`}
                            onChange={(next) => updateExperienceBullet(entryIndex, bulletIndex, next)}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}

              {draft.education.length > 0 && (
                <section aria-labelledby="education-title" className="space-y-2">
                  <h2 id="education-title" className={SECTION_TITLE}>
                    Education
                  </h2>
                  <ul className="space-y-1 px-1 text-sm text-stone-900">
                    {draft.education.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              )}

              {draft.certifications.length > 0 && (
                <section aria-labelledby="certifications-title" className="space-y-2">
                  <h2 id="certifications-title" className={SECTION_TITLE}>
                    Certifications
                  </h2>
                  <ul className="list-disc space-y-1 pl-6 text-sm text-stone-900">
                    {draft.certifications.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              )}
            </article>
          </>
        )}
      </div>
    </main>
  );
}
