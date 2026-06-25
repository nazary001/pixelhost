import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          backgroundColor: "#0f1b2d",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: "72px", fontWeight: 700 }}>
          <span>Pixel</span>
          <span style={{ color: "#0891b2" }}>Host</span>
        </div>
        <div
          style={{
            marginTop: "36px",
            width: "420px",
            height: "10px",
            borderRadius: "5px",
            backgroundColor: "#0891b2",
          }}
        />
        <div
          style={{
            marginTop: "36px",
            fontSize: "34px",
            color: "#cbd5e1",
            maxWidth: "920px",
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    size,
  );
}
