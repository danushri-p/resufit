import { ImageResponse } from "next/og";

export const alt = "ResuFit — Honest resume-to-job matching";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect x="0.5" y="0.5" width="119" height="119" rx="28" fill="#0B1020" stroke="#1E293B"/>
  <path d="M36 90 V30 H56 L68 42 V50 Q68 62 56 62 H36" fill="none" stroke="#F8FAFC" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M56 24 L74 42 H62 Q56 42 56 36 Z" fill="#818CF8"/>
  <polyline points="50,62 62,84 92,48" fill="none" stroke="#34D399" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
const logoDataUrl = `data:image/svg+xml,${encodeURIComponent(logoSvg)}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 48,
          padding: 80,
          background: "#0B1020",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUrl} width={160} height={160} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 600,
              letterSpacing: "-4px",
              color: "#FFFFFF",
            }}
          >
            Resu<span style={{ color: "#34D399" }}>Fit</span>
          </div>
          <div style={{ fontSize: 36, color: "#C7D2FE" }}>
            Honest resume-to-job matching
          </div>
        </div>
      </div>
    ),
    size,
  );
}
