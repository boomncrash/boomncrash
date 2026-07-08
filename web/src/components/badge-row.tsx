import type { Badge } from "@/lib/badges";

interface BadgeRowProps {
  badges: Badge[];
  size?: "sm" | "md";
  showTooltips?: boolean;
}

export function BadgeRow({ badges, size = "md", showTooltips = false }: BadgeRowProps) {
  if (badges.length === 0) return null;

  const pill = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.id}
          title={showTooltips ? undefined : badge.description}
          className={`group/badge relative inline-flex items-center gap-1 rounded-full font-medium ${pill}`}
          style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
        >
          <span>{badge.emoji}</span>
          {badge.label}
          {showTooltips && (
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs font-normal text-zinc-200 opacity-0 shadow-lg transition-opacity group-hover/badge:opacity-100"
            >
              {badge.description}
              <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
