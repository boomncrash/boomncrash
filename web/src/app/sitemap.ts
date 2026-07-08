import type { MetadataRoute } from "next";
import { getBounties } from "@/lib/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const bounties = await getBounties();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: appUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${appUrl}/explore`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${appUrl}/create`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${appUrl}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: `${appUrl}/wallet`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const bountyRoutes: MetadataRoute.Sitemap = bounties
    .filter((b) => b.status === "open" || b.status === "funding")
    .map((b) => ({
      url: `${appUrl}/bounty/${b.id}`,
      lastModified: new Date(b.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

  return [...staticRoutes, ...bountyRoutes];
}

export const revalidate = 3600;
