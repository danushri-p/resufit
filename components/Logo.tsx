interface LogoProps {
  size?: number;
  iconOnly?: boolean;
  className?: string;
}

export function Logo({
  size = 32,
  iconOnly = false,
  className,
}: LogoProps) {
  return (
    <span
      aria-label="ResuFit"
      className={`inline-flex max-w-full items-center gap-2 ${className ?? ""}`}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width={size}
        height={size}
        viewBox="0 0 120 120"
        className="shrink-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="0.5"
          y="0.5"
          width="119"
          height="119"
          rx="28"
          fill="#0B1020"
          stroke="#1E293B"
        />
        <path
          d="M36 90 V30 H56 L68 42 V50 Q68 62 56 62 H36"
          fill="none"
          stroke="#F8FAFC"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M56 24 L74 42 H62 Q56 42 56 36 Z" fill="#818CF8" />
        <polyline
          points="50,62 62,84 92,48"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!iconOnly && (
        <span
          className="whitespace-nowrap font-semibold text-slate-900"
          style={{ fontSize: size * 0.72, letterSpacing: "-0.04em" }}
        >
          Resu<span className="text-cyan-700">Fit</span>
        </span>
      )}
    </span>
  );
}
