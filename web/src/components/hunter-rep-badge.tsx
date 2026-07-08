import Link from "next/link";
import { Award } from "lucide-react";
import type { HunterRepSummary } from "@/lib/hunter-rep";
import { truncateAddress } from "@/lib/utils";

interface HunterRepBadgeProps {
  hunterAddress: string;
  rep?: HunterRepSummary;
}

export function HunterRepBadge({ hunterAddress, rep }: HunterRepBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/profile/${encodeURIComponent(hunterAddress)}`}
        className="text-sm hover:text-emerald-400"
      >
        {truncateAddress(hunterAddress)}
      </Link>
      {rep && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${rep.tier.color}20`, color: rep.tier.color }}
          title={`${rep.reputationScore} rep · ${rep.completedBounties} completed`}
        >
          <Award className="h-3 w-3" />
          {rep.tier.label}
        </span>
      )}
    </div>
  );
}
