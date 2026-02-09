import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Dlishe — Your Recipes, All in One Place";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
          background: "linear-gradient(135deg, #F4F5F7 0%, #DFF7C4 50%, #CCB7F9 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "#385225",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "40px",
              fontWeight: 800,
            }}
          >
            D
          </div>
          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#385225",
              letterSpacing: "-2px",
            }}
          >
            Dlishe
          </div>
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#111111",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          Your Recipes, All in One Place
        </div>
        <div
          style={{
            fontSize: "18px",
            color: "#6b6b6b",
            maxWidth: "600px",
            textAlign: "center",
          }}
        >
          Save recipes from TikTok, YouTube, any website, or snap a cookbook page.
        </div>
      </div>
    ),
    { ...size }
  );
}
