import { ImageResponse } from "next/og";

export const dynamic = "force-static";

/** Square 512×512 brand mark used by the web manifest and Organization JSON-LD. */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f1b2d",
          borderRadius: "64px",
        }}
      >
        <div
          style={{
            fontSize: "200px",
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: "Arial, sans-serif",
          }}
        >
          PH
        </div>
        <div
          style={{
            marginTop: "24px",
            width: "280px",
            height: "36px",
            borderRadius: "18px",
            backgroundColor: "#0891b2",
          }}
        />
      </div>
    ),
    { width: 512, height: 512 },
  );
}
