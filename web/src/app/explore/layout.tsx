import type { Metadata } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { JsonLd, websiteJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: `Explore Bounties — ${APP_NAME}`,
  description: `Browse open USDC bounties and live Rallies on Base and Solana. ${APP_TAGLINE}`,
  openGraph: {
    title: `Explore Bounties | ${APP_NAME}`,
    description: `Browse global USDC bounties and crowdfunded Rallies. ${APP_TAGLINE}`,
    type: "website",
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      {children}
    </>
  );
}
