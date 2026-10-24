export function scoreTone(score: number): { stroke: string; text: string; bg: string; bar: string } {
  if (score >= 75) {
    return { stroke: "stroke-green-500", text: "text-green-800", bg: "bg-green-100", bar: "bg-green-500" };
  }
  if (score >= 50) {
    return { stroke: "stroke-amber-500", text: "text-amber-800", bg: "bg-amber-100", bar: "bg-amber-500" };
  }
  return { stroke: "stroke-red-500", text: "text-red-800", bg: "bg-red-100", bar: "bg-red-500" };
}

interface ScoreRingProps {
  score: number;
  label: string;
  size?: number;
  className?: string;
}

/** Circular 0–100 score, exposed to assistive technology as a progress bar. */
export function ScoreRing({ score, label, size = 72, className }: ScoreRingProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, score));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      className={`relative inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="10" className="stroke-stone-200" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className={scoreTone(value).stroke}
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute font-bold text-stone-900"
        style={{ fontSize: size * 0.26 }}
      >
        {score}%
      </span>
    </div>
  );
}

/** Horizontal labelled score bar. */
export function ScoreBar({ label, score, detail }: { label: string; score: number; detail?: string }) {
  const tone = scoreTone(score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-stone-800">{label}</span>
        <span className="font-semibold text-stone-900">{score}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="h-2 overflow-hidden rounded-full bg-stone-200"
      >
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${score}%` }} />
      </div>
      {detail && <p className="text-xs text-stone-600">{detail}</p>}
    </div>
  );
}
