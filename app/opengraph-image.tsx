import { ImageResponse } from "next/og";
import { WARD_NAME } from "@/lib/ward";

// Shared-link preview for every route. Built once at build time; colours match globals.css.
export const alt = `${WARD_NAME} Sacrament Meetings: weekly programmes, hymns, and speakers`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#f7f6f1", color: "#233c39" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 88, height: 88, borderRadius: 44, background: "#233c39", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 700 }}>B</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 44, fontWeight: 700 }}>{WARD_NAME}</div>
            <div style={{ fontSize: 24, letterSpacing: 4, color: "#57675e" }}>SACRAMENT MEETINGS</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, lineHeight: 1.1 }}>A moment to gather. A time to remember.</div>
          <div style={{ fontSize: 32, color: "#57675e" }}>Weekly programmes, hymns, speakers, and announcements.</div>
        </div>
        <div style={{ display: "flex", height: 12, background: "#e6ece3", borderRadius: 6 }} />
      </div>
    ),
    size,
  );
}