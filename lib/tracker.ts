import { z } from "zod";

const APPLICATIONS_KEY = "resufit:applications";
const MAX_APPLICATIONS = 100;

export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Enter a valid date.");

const jobUrl = z
  .string()
  .trim()
  .max(2000, "Keep the job link under 2,000 characters.")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a link that starts with http:// or https://.");

export const ApplicationInputSchema = z.object({
  role: z
    .string()
    .trim()
    .min(1, "Enter the role.")
    .max(120, "Keep the role under 120 characters."),
  company: z
    .string()
    .trim()
    .min(1, "Enter the company.")
    .max(120, "Keep the company under 120 characters."),
  status: z.enum(APPLICATION_STATUSES),
  appliedOn: isoDate.nullable(),
  followUpOn: isoDate.nullable(),
  jobUrl: jobUrl.nullable(),
  notes: z.string().max(2000, "Keep notes under 2,000 characters."),
  matchScore: z.number().int().min(0).max(100).nullable(),
  historyId: z.string().min(1).nullable(),
});

export const ApplicationSchema = ApplicationInputSchema.extend({
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ApplicationInput = z.infer<typeof ApplicationInputSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationFieldErrors = Partial<
  Record<keyof ApplicationInput, string>
>;

export interface TrackerStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  responseRate: number | null;
  followUpsDue: number;
}

export function todayIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function isFollowUpDue(
  application: Pick<Application, "followUpOn" | "status">,
  today: string = todayIsoDate(),
): boolean {
  return (
    application.followUpOn !== null &&
    application.followUpOn <= today &&
    application.status !== "offer" &&
    application.status !== "rejected"
  );
}

export function validateApplicationInput(
  input: unknown,
):
  | { success: true; data: ApplicationInput }
  | { success: false; errors: ApplicationFieldErrors } {
  const parsed = ApplicationInputSchema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };

  const errors: ApplicationFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof ApplicationInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { success: false, errors };
}

function readApplications(): Application[] {
  try {
    const value = localStorage.getItem(APPLICATIONS_KEY);
    if (!value) return [];

    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => ApplicationSchema.safeParse(entry))
      .filter((entry) => entry.success)
      .map((entry) => entry.data);
  } catch {
    return [];
  }
}

function writeApplications(applications: Application[]): boolean {
  try {
    localStorage.setItem(
      APPLICATIONS_KEY,
      JSON.stringify(applications.slice(0, MAX_APPLICATIONS)),
    );
    return true;
  } catch {
    return false;
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function withAppliedDate<T extends Pick<ApplicationInput, "status" | "appliedOn">>(
  application: T,
): T {
  return application.status === "applied" && !application.appliedOn
    ? { ...application, appliedOn: todayIsoDate() }
    : application;
}

export function sortApplications(
  applications: Application[],
  today: string = todayIsoDate(),
): Application[] {
  return [...applications].sort((first, second) => {
    const firstDue = isFollowUpDue(first, today);
    const secondDue = isFollowUpDue(second, today);
    if (firstDue !== secondDue) return firstDue ? -1 : 1;
    if (firstDue && secondDue && first.followUpOn !== second.followUpOn) {
      return (first.followUpOn ?? "").localeCompare(second.followUpOn ?? "");
    }
    return second.updatedAt.localeCompare(first.updatedAt);
  });
}

export function listApplications(): Application[] {
  return sortApplications(readApplications());
}

export function getApplication(id: string): Application | undefined {
  return readApplications().find((application) => application.id === id);
}

export function findApplicationByHistoryId(
  historyId: string,
): Application | undefined {
  return readApplications().find(
    (application) => application.historyId === historyId,
  );
}

function sameText(first: string, second: string): boolean {
  return first.trim().toLowerCase() === second.trim().toLowerCase();
}

export function findTrackedApplication({
  historyId,
  role,
  company,
}: Pick<ApplicationInput, "historyId" | "role" | "company">):
  | Application
  | undefined {
  return readApplications().find(
    (application) =>
      application.historyId === historyId &&
      sameText(application.role, role) &&
      sameText(application.company, company),
  );
}

export function saveApplication(input: ApplicationInput): Application | undefined {
  const now = new Date().toISOString();
  const parsed = ApplicationSchema.safeParse({
    ...withAppliedDate(input),
    id: newId(),
    createdAt: now,
    updatedAt: now,
  });
  if (!parsed.success) return undefined;

  const saved = writeApplications([parsed.data, ...readApplications()]);
  return saved ? parsed.data : undefined;
}

export function updateApplication(
  id: string,
  update: Partial<ApplicationInput>,
): Application | undefined {
  const applications = readApplications();
  const index = applications.findIndex((application) => application.id === id);
  if (index === -1) return undefined;

  const parsed = ApplicationSchema.safeParse({
    ...withAppliedDate({ ...applications[index], ...update }),
    updatedAt: new Date().toISOString(),
  });
  if (!parsed.success) return undefined;

  applications[index] = parsed.data;
  return writeApplications(applications) ? parsed.data : undefined;
}

export function deleteApplication(id: string): void {
  writeApplications(
    readApplications().filter((application) => application.id !== id),
  );
}

export function clearApplications(): void {
  try {
    localStorage.removeItem(APPLICATIONS_KEY);
  } catch {
    return;
  }
}

export function getTrackerStats(
  applications: Application[],
  today: string = todayIsoDate(),
): TrackerStats {
  const byStatus = Object.fromEntries(
    APPLICATION_STATUSES.map((status) => [status, 0]),
  ) as Record<ApplicationStatus, number>;
  for (const application of applications) byStatus[application.status] += 1;

  const responded = byStatus.interviewing + byStatus.offer + byStatus.rejected;
  const appliedOrLater = byStatus.applied + responded;

  return {
    total: applications.length,
    byStatus,
    responseRate:
      appliedOrLater === 0 ? null : Math.round((responded / appliedOrLater) * 100),
    followUpsDue: applications.filter((application) =>
      isFollowUpDue(application, today),
    ).length,
  };
}

const CSV_COLUMNS: Array<{ header: string; value: (application: Application) => string }> = [
  { header: "Role", value: (application) => application.role },
  { header: "Company", value: (application) => application.company },
  { header: "Status", value: (application) => APPLICATION_STATUS_LABELS[application.status] },
  { header: "Applied on", value: (application) => application.appliedOn ?? "" },
  { header: "Follow up on", value: (application) => application.followUpOn ?? "" },
  { header: "Match score", value: (application) => application.matchScore?.toString() ?? "" },
  { header: "Job link", value: (application) => application.jobUrl ?? "" },
  { header: "Notes", value: (application) => application.notes },
  { header: "Updated", value: (application) => application.updatedAt },
];

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function exportApplicationsCsv(applications: Application[]): string {
  const rows = [
    CSV_COLUMNS.map((column) => column.header),
    ...applications.map((application) =>
      CSV_COLUMNS.map((column) => column.value(application)),
    ),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
