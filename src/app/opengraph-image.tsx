import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";

export const alt = `${profile.name} — ${profile.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social preview card, rendered at build time. Uses system fonts only so it
 * never needs a network fetch during the build.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#06070b",
          backgroundImage:
            "radial-gradient(900px 500px at 10% -20%, rgba(110,231,255,0.20), transparent 70%), radial-gradient(700px 500px at 110% 20%, rgba(167,139,250,0.16), transparent 70%)",
          padding: 80,
          color: "#e9ecf5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#6ee7ff",
            }}
          />
          {/* Satori needs a single text child per leaf node — build the string
              up front rather than interpolating inline. */}
          <div style={{ fontSize: 26, color: "#8a90a6" }}>
            {`${profile.role} · ${profile.location}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 40, color: "#8a90a6" }}>{profile.name}</div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1.05,
              color: "#ffffff",
            }}
          >
            Code. Create. Reimagine.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "#5b6178",
          }}
        >
          <div>6+ years · 10+ projects shipped</div>
          <div>{profile.email}</div>
        </div>
      </div>
    ),
    size,
  );
}
