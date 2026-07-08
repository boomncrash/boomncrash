import type { Bounty, HunterProfile } from "@/lib/types";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { formatUsdc, truncateAddress } from "@/lib/utils";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    description: APP_TAGLINE,
    url: appUrl(),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP_NAME,
    url: appUrl(),
    description:
      "Global USDC bounty marketplace on Base and Solana. Post tasks, complete bounties, get paid in stablecoin.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${appUrl()}/explore`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function bountyJobPostingJsonLd(bounty: Bounty) {
  const url = `${appUrl()}/bounty/${bounty.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: bounty.title,
    description: bounty.description,
    datePosted: bounty.createdAt,
    validThrough: bounty.deadline,
    employmentType: "CONTRACTOR",
    hiringOrganization: {
      "@type": "Organization",
      name: APP_NAME,
      sameAs: appUrl(),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "NG",
      },
    },
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: {
      "@type": "Country",
      name: "Worldwide",
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        value: bounty.rewardUsdc,
        unitText: "USDC",
      },
    },
    identifier: {
      "@type": "PropertyValue",
      name: APP_NAME,
      value: bounty.id,
    },
    url,
    directApply: true,
  };
}

export function bountyOfferJsonLd(bounty: Bounty) {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: bounty.title,
    description: bounty.description.slice(0, 200),
    price: bounty.rewardUsdc,
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: `${appUrl()}/bounty/${bounty.id}`,
    priceSpecification: {
      "@type": "PriceSpecification",
      price: bounty.rewardUsdc,
      priceCurrency: "USD",
      valueAddedTaxIncluded: false,
    },
    seller: {
      "@type": "Organization",
      name: APP_NAME,
    },
    itemOffered: {
      "@type": "Service",
      name: formatUsdc(bounty.rewardUsdc),
      description: bounty.deliverables.slice(0, 120),
    },
  };
}

export function hunterProfileJsonLd(profile: HunterProfile, tierLabel: string) {
  const url = `${appUrl()}/profile/${encodeURIComponent(profile.address)}`;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${truncateAddress(profile.address)} — ${APP_NAME} Hunter`,
    description: `${tierLabel} hunter on ${APP_NAME}. ${profile.completedBounties} bounties completed, ${formatUsdc(profile.totalEarnedUsdc)} USDC earned.`,
    url,
    mainEntity: {
      "@type": "Person",
      name: truncateAddress(profile.address),
      identifier: profile.address,
      url,
      memberOf: {
        "@type": "Organization",
        name: APP_NAME,
        url: appUrl(),
      },
      knowsAbout: ["USDC bounties", "freelance tasks", "Web3"],
    },
  };
}

export function leaderboardJsonLd(
  leaders: HunterProfile[],
  tierFor: (score: number) => { label: string }
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${APP_NAME} Leaderboard`,
    description: `Top hunters ranked by reputation on ${APP_NAME}. ${APP_TAGLINE}`,
    url: `${appUrl()}/leaderboard`,
    numberOfItems: leaders.length,
    itemListElement: leaders.map((profile, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${appUrl()}/profile/${encodeURIComponent(profile.address)}`,
      item: {
        "@type": "Person",
        name: truncateAddress(profile.address),
        identifier: profile.address,
        description: `${tierFor(profile.reputationScore).label} · ${profile.reputationScore} rep · ${profile.completedBounties} completed`,
      },
    })),
  };
}

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
