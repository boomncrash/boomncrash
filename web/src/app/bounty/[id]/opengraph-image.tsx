import { ImageResponse } from "next/og";
import { getBountyById } from "@/lib/repository";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { formatUsdc } from "@/lib/utils";

export const runtime = "nodejs";
export const alt = `${APP_NAME} bounty`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: RouteProps) {
  const { id } = await params;
  const bounty = await getBountyById(id);

  const title = bounty?.title ?? `Bounty on ${APP_NAME}`;
  const reward = bounty ? formatUsdc(bounty.rewardUsdc) : "$0 USDC";
  const chain = bounty?.chain?.toUpperCase() ?? "USDC";
  const category = bounty?.category?.replace("_", " ") ?? "task";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #0a0a0f 0%, #0f1f1a 50%, #0a1628 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
            }}
          />
          <span style={{ fontSize: 28, fontWeight: 700 }}>{APP_NAME}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p
            style={{
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#10b981",
              margin: 0,
            }}
          >
            {category} · {chain}
          </p>
          <p
            style={{
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.15,
              margin: 0,
              maxWidth: 900,
            }}
          >
            {title.length > 80 ? `${title.slice(0, 77)}…` : title}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <p style={{ fontSize: 64, fontWeight: 700, color: "#34d399", margin: 0 }}>{reward}</p>
          <p style={{ fontSize: 24, color: "#a1a1aa", margin: 0 }}>{APP_TAGLINE}</p>
        </div>
      </div>
    ),
    { ...size }
  );
}
