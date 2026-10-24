/** Decorative resume sheet with a target, drawn with palette classes so it adapts to dark mode. */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 280"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="170" cy="140" r="120" className="fill-indigo-100" opacity="0.7" />
      <path d="M262 46 l5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5z" className="fill-indigo-300" />
      <path d="M40 200 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" className="fill-indigo-200" />

      <g transform="rotate(-6 150 130)">
        <rect x="92" y="40" width="150" height="190" rx="14" className="fill-indigo-200" />
        <rect x="84" y="32" width="150" height="190" rx="14" className="fill-white stroke-indigo-200" strokeWidth="2" />
        <circle cx="116" cy="66" r="15" className="fill-indigo-100" />
        <circle cx="116" cy="61" r="6" className="fill-indigo-500" />
        <path d="M105 76 q11 -12 22 0" className="fill-indigo-500" />
        <rect x="140" y="56" width="70" height="8" rx="4" className="fill-indigo-300" />
        <rect x="140" y="70" width="48" height="6" rx="3" className="fill-stone-200" />
        {[100, 116, 132].map((y, index) => (
          <rect key={y} x="102" y={y} width={index === 1 ? 94 : 112} height="6" rx="3" className="fill-stone-200" />
        ))}
        <rect x="102" y="152" width="56" height="7" rx="3.5" className="fill-indigo-300" />
        {[168, 182].map((y, index) => (
          <rect key={y} x="102" y={y} width={index ? 80 : 112} height="6" rx="3" className="fill-stone-200" />
        ))}
      </g>

      <g transform="translate(232 206)">
        <circle r="44" className="fill-white stroke-indigo-200" strokeWidth="2" />
        <circle r="34" className="fill-indigo-600" />
        <circle r="25" className="fill-white" />
        <circle r="16" className="fill-indigo-600" />
        <circle r="7" className="fill-white" />
        <path d="M2 -2 L38 -38" className="stroke-indigo-800" strokeWidth="5" strokeLinecap="round" />
        <path d="M30 -46 L46 -46 L46 -30 L38 -38 Z" className="fill-cyan-500" />
      </g>
    </svg>
  );
}
