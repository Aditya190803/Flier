import { ImageResponse } from "next/og";

import { APP_NAME } from "@/lib/brand";
import { SITE_URL } from "@/lib/seo";

const size = { width: 1200, height: 630 };
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: "#f8fafc",
        color: "#0f172a",
        padding: "64px 72px",
      }}
    >
      <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#2563eb" }}>
        {APP_NAME}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
          Personalized email campaigns through Gmail
        </div>
        <div style={{ fontSize: 28, color: "#475569" }}>
          Import CSV contacts. Personalize. Preview. Send.
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#475569" }}>
        {new URL(SITE_URL).hostname}
      </div>
    </div>,
    size,
  );
}
