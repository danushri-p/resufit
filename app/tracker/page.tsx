"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  clearApplications,
  deleteApplication,
  exportApplicationsCsv,
  getTrackerStats,
  isFollowUpDue,
  listApplications,
  saveApplication,
  todayIsoDate,
  updateApplication,
  validateApplicationInput,
  type Application,
  type ApplicationFieldErrors,
  type ApplicationStatus,
} from "@/lib/tracker";

type Filter = "all" | ApplicationStatus;

interface FormValues {
  role: string;
  company: string;
  status: ApplicationStatus;
  appliedOn: string;
  followUpOn: string;
  jobUrl: string;
  notes: string;
}

const EMPTY_FORM: FormValues = {
  role: "",
  company: "",
  status: "saved",
  appliedOn: "",
  followUpOn: "",
  jobUrl: "",
  notes: "",
};

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  saved: "bg-stone-200 text-stone-900",
  applied: "bg-indigo-100 text-indigo-950",
  interviewing: "bg-cyan-100 text-cyan-950",
  offer: "bg-green-100 text-green-950",
  rejected: "bg-red-100 text-red-950",
};

const NAV_LINK =
  "rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600";
const FIELD =
  "w-full min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 aria-invalid:border-red-700";
const LABEL = "grid gap-1 text-sm font-medium text-stone-800";

function formatDay(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

function toFormValues(application: Application): FormValues {
  return {
    role: application.role,
    company: application.company,
    status: application.status,
    appliedOn: application.appliedOn ?? "",
    followUpOn: application.followUpOn ?? "",
    jobUrl: application.jobUrl ?? "",
    notes: application.notes,
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="text-sm font-normal text-red-700">
      {message}
    </span>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={LABEL}>
      <label htmlFor={id}>{label}</label>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export default function TrackerPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [today, setToday] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<{ id: string | null }>();
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<ApplicationFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>();
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setToday(todayIsoDate());
      setApplications(listApplications());
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function refresh() {
    setApplications(listApplications());
  }

  function openAddForm() {
    setEditing({ id: null });
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError(undefined);
  }

  function openEditForm(application: Application) {
    setEditing({ id: application.id });
    setForm(toFormValues(application));
    setErrors({});
    setFormError(undefined);
  }

  function closeForm() {
    setEditing(undefined);
    setErrors({});
    setFormError(undefined);
  }

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const existing = editing.id
      ? applications.find((application) => application.id === editing.id)
      : undefined;
    const result = validateApplicationInput({
      role: form.role,
      company: form.company,
      status: form.status,
      appliedOn: form.appliedOn || null,
      followUpOn: form.followUpOn || null,
      jobUrl: form.jobUrl.trim() || null,
      notes: form.notes,
      matchScore: existing?.matchScore ?? null,
      historyId: existing?.historyId ?? null,
    });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    const saved = editing.id
      ? updateApplication(editing.id, result.data)
      : saveApplication(result.data);
    if (!saved) {
      setFormError("Could not save in this browser. Storage may be full or blocked.");
      return;
    }
    refresh();
    closeForm();
  }

  function changeStatus(id: string, status: ApplicationStatus) {
    updateApplication(id, { status });
    refresh();
  }

  function removeApplication(id: string) {
    deleteApplication(id);
    setConfirmDeleteId(undefined);
    if (editing?.id === id) closeForm();
    refresh();
  }

  function removeAll() {
    clearApplications();
    setConfirmClear(false);
    closeForm();
    refresh();
  }

  function downloadCsv() {
    const blob = new Blob([`﻿${exportApplicationsCsv(applications)}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resufit-applications.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const stats = getTrackerStats(applications, today);
  const visible =
    filter === "all"
      ? applications
      : applications.filter((application) => application.status === filter);

  const applicationForm = editing && (
    <form
      onSubmit={submitForm}
      noValidate
      aria-labelledby="application-form-title"
      className="grid gap-4 rounded-xl bg-white p-5 ring-1 ring-foreground/10"
    >
      <h2 id="application-form-title" className="text-lg font-medium text-stone-900">
        {editing.id ? "Edit application" : "Add application"}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="role" label="Role" error={errors.role}>
          <input
            id="role"
            className={FIELD}
            value={form.role}
            onChange={(event) => updateField("role", event.target.value)}
            aria-invalid={Boolean(errors.role)}
            aria-describedby={errors.role ? "role-error" : undefined}
            maxLength={120}
            autoComplete="off"
          />
        </Field>
        <Field id="company" label="Company" error={errors.company}>
          <input
            id="company"
            className={FIELD}
            value={form.company}
            onChange={(event) => updateField("company", event.target.value)}
            aria-invalid={Boolean(errors.company)}
            aria-describedby={errors.company ? "company-error" : undefined}
            maxLength={120}
            autoComplete="off"
          />
        </Field>
        <Field id="status" label="Status">
          <select
            id="status"
            className={FIELD}
            value={form.status}
            onChange={(event) => updateField("status", event.target.value as ApplicationStatus)}
          >
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {APPLICATION_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="job-url" label="Job link (optional)" error={errors.jobUrl}>
          <input
            id="job-url"
            className={FIELD}
            type="url"
            inputMode="url"
            placeholder="https://company.com/jobs/123"
            value={form.jobUrl}
            onChange={(event) => updateField("jobUrl", event.target.value)}
            aria-invalid={Boolean(errors.jobUrl)}
            aria-describedby={errors.jobUrl ? "job-url-error" : undefined}
          />
        </Field>
        <Field id="applied-on" label="Applied on (optional)" error={errors.appliedOn}>
          <input
            id="applied-on"
            className={FIELD}
            type="date"
            value={form.appliedOn}
            onChange={(event) => updateField("appliedOn", event.target.value)}
            aria-invalid={Boolean(errors.appliedOn)}
            aria-describedby={errors.appliedOn ? "applied-on-error" : undefined}
          />
        </Field>
        <Field id="follow-up-on" label="Follow up on (optional)" error={errors.followUpOn}>
          <input
            id="follow-up-on"
            className={FIELD}
            type="date"
            value={form.followUpOn}
            onChange={(event) => updateField("followUpOn", event.target.value)}
            aria-invalid={Boolean(errors.followUpOn)}
            aria-describedby={errors.followUpOn ? "follow-up-on-error" : undefined}
          />
        </Field>
      </div>
      <Field id="notes" label="Notes (optional)" error={errors.notes}>
        <textarea
          id="notes"
          className={`${FIELD} min-h-24`}
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? "notes-error" : undefined}
          maxLength={2000}
        />
      </Field>
      {formError && (
        <p className="text-sm text-red-700" role="alert">
          {formError}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Save</Button>
        <Button type="button" variant="outline" onClick={closeForm}>
          Cancel
        </Button>
      </div>
    </form>
  );

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" aria-label="ResuFit" className="mb-2 inline-flex">
              <Logo />
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
              Application tracker
            </h1>
            <p className="mt-2 text-stone-600">Saved only in this browser.</p>
          </div>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-2">
            <Link href="/analyze" className={NAV_LINK}>
              Analyze a resume
            </Link>
            <Link href="/compare" className={NAV_LINK}>
              Compare jobs
            </Link>
            <Link href="/history" className={NAV_LINK}>
              History
            </Link>
          </nav>
        </header>

        {isLoading ? (
          <p className="text-sm text-stone-600" role="status">
            Loading applications…
          </p>
        ) : applications.length === 0 && !editing ? (
          <div className="rounded-xl bg-white p-8 text-center ring-1 ring-foreground/10">
            <h2 className="text-lg font-medium text-stone-900">
              Track your first application
            </h2>
            <p className="mt-2 text-stone-600">
              Keep every role, its status and your next follow-up in one place.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={openAddForm}>
                Add application
              </Button>
              <Link
                href="/analyze"
                className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-800 ring-1 ring-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
              >
                Analyze a resume
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section aria-label="Application summary" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ["Total", stats.total],
                ["Applied", stats.byStatus.applied],
                ["Interviewing", stats.byStatus.interviewing],
                ["Offers", stats.byStatus.offer],
                [
                  "Response rate",
                  stats.responseRate === null ? "—" : `${stats.responseRate}%`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-white p-3 ring-1 ring-foreground/10">
                  <p className="text-sm text-stone-600">{label}</p>
                  <p className="text-2xl font-semibold text-stone-900">{value}</p>
                </div>
              ))}
            </section>
            {stats.followUpsDue > 0 && (
              <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm font-medium text-amber-950" role="status">
                {stats.followUpsDue} {stats.followUpsDue === 1 ? "follow-up" : "follow-ups"} due
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              {!editing && (
                <Button type="button" onClick={openAddForm}>
                  Add application
                </Button>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadCsv}
                  disabled={applications.length === 0}
                >
                  Export CSV
                </Button>
                {confirmClear ? (
                  <>
                    <span className="text-sm text-stone-700">Delete all applications?</span>
                    <Button type="button" variant="destructive" onClick={removeAll}>
                      Confirm clear
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setConfirmClear(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmClear(true)}
                    disabled={applications.length === 0}
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            {applicationForm}

            {applications.length > 0 && (
              <>
                <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
                  {(["all", ...APPLICATION_STATUSES] as Filter[]).map((option) => {
                    const count =
                      option === "all" ? stats.total : stats.byStatus[option];
                    const label =
                      option === "all" ? "All" : APPLICATION_STATUS_LABELS[option];
                    return (
                      <Button
                        key={option}
                        type="button"
                        size="sm"
                        variant={filter === option ? "default" : "outline"}
                        aria-pressed={filter === option}
                        onClick={() => setFilter(option)}
                      >
                        {label} ({count})
                      </Button>
                    );
                  })}
                </div>

                {visible.length === 0 ? (
                  <p className="text-sm text-stone-600">No applications with this status.</p>
                ) : (
                  <ul className="space-y-4" aria-label="Applications">
                    {visible.map((application) => {
                      const due = Boolean(today) && isFollowUpDue(application, today);
                      return (
                        <li
                          key={application.id}
                          className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-foreground/10"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <h2 className="break-words text-lg font-medium text-stone-900">
                                {application.role} · {application.company}
                              </h2>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_BADGE[application.status]}`}
                                >
                                  {APPLICATION_STATUS_LABELS[application.status]}
                                </span>
                                {due && (
                                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-950">
                                    Follow up due
                                  </span>
                                )}
                                {application.matchScore !== null && (
                                  <span className="text-sm text-stone-700">
                                    Match {application.matchScore}/100
                                  </span>
                                )}
                              </div>
                            </div>
                            <label className="grid gap-1 text-sm text-stone-700">
                              <span className="sr-only">
                                Status for {application.role} at {application.company}
                              </span>
                              <select
                                className={`${FIELD} w-auto`}
                                value={application.status}
                                onChange={(event) =>
                                  changeStatus(application.id, event.target.value as ApplicationStatus)
                                }
                              >
                                {APPLICATION_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {APPLICATION_STATUS_LABELS[status]}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          {(application.appliedOn || application.followUpOn) && (
                            <p className="text-sm text-stone-700">
                              {application.appliedOn && <>Applied {formatDay(application.appliedOn)}</>}
                              {application.appliedOn && application.followUpOn && " · "}
                              {application.followUpOn && <>Follow up {formatDay(application.followUpOn)}</>}
                            </p>
                          )}
                          {application.notes && (
                            <p className="whitespace-pre-wrap break-words text-sm text-stone-700">
                              {application.notes}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            {application.jobUrl && (
                              <a
                                href={application.jobUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md px-2 py-1 text-sm font-medium text-indigo-800 underline underline-offset-2 hover:text-indigo-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
                              >
                                Job posting<span className="sr-only"> (opens in a new tab)</span>
                              </a>
                            )}
                            {application.historyId && (
                              <Link
                                href={`/history?open=${encodeURIComponent(application.historyId)}`}
                                className="rounded-md px-2 py-1 text-sm font-medium text-indigo-800 underline underline-offset-2 hover:text-indigo-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700"
                              >
                                Open analysis
                              </Link>
                            )}
                            <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(application)}>
                              Edit
                            </Button>
                            {confirmDeleteId === application.id ? (
                              <>
                                <span className="text-sm text-stone-700">Delete this application?</span>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeApplication(application.id)}
                                >
                                  Confirm delete
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfirmDeleteId(undefined)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmDeleteId(application.id)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
