import { APPLICATION_STATUS_LABELS, type Application } from "@/lib/tracker";

const CRLF = "\r\n";

/** Escapes text values per RFC 5545 (backslash, semicolon, comma, newline). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Folds content lines longer than 75 octets, as RFC 5545 requires. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const character of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (encoder.encode(current + character).length > limit) {
      parts.push(current);
      current = character;
    } else {
      current += character;
    }
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

function compactDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function nextDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildFollowUpIcs(
  application: Application,
  now: Date = new Date(),
): string | undefined {
  if (!application.followUpOn) return undefined;

  const description = [
    `Status: ${APPLICATION_STATUS_LABELS[application.status]}`,
    application.matchScore !== null ? `ResuFit match: ${application.matchScore}/100` : "",
    application.jobUrl ? `Job posting: ${application.jobUrl}` : "",
    application.notes ? `Notes: ${application.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ResuFit//Application tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(application.id)}-follow-up@resufit`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;VALUE=DATE:${compactDate(application.followUpOn)}`,
    `DTEND;VALUE=DATE:${nextDay(application.followUpOn)}`,
    `SUMMARY:${escapeIcsText(`Follow up: ${application.role} at ${application.company}`)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    ...(application.jobUrl ? [`URL:${application.jobUrl}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

export function followUpFileName(application: Application): string {
  const slug = `${application.role}-${application.company}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `resufit-follow-up-${slug || "application"}.ics`;
}
