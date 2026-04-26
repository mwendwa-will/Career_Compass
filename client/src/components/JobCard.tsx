import { motion } from "framer-motion";
import { ArrowUpRight, Building2, MapPin, Sparkles, Zap } from "lucide-react";
import type { Job, MatchResult } from "@shared/schema";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  match?: MatchResult;
  isSelected?: boolean;
  onClick: () => void;
}

function scoreTone(score: number) {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

const toneClasses = {
  success: {
    text: "text-success",
    ring: "stroke-success",
    chip: "bg-success/10 text-success",
    track: "stroke-success/15",
  },
  warning: {
    text: "text-warning",
    ring: "stroke-warning",
    chip: "bg-warning/10 text-warning",
    track: "stroke-warning/15",
  },
  danger: {
    text: "text-danger",
    ring: "stroke-danger",
    chip: "bg-danger/10 text-danger",
    track: "stroke-danger/15",
  },
} as const;

export function JobCard({ job, match, isSelected, onClick }: JobCardProps) {
  const score = match?.matchPercentage ?? 0;
  const tone = scoreTone(score);
  const t = toneClasses[tone];

  // SVG ring math (r=22, c=2πr ≈ 138.23)
  const C = 138.23;
  const offset = C - (C * score) / 100;

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl bg-card p-5 text-left transition-all duration-300",
        isSelected
          ? "shadow-lift ring-2 ring-primary"
          : "shadow-soft ring-1 ring-inset ring-border/60 hover:shadow-lift hover:ring-primary/30"
      )}
    >
      {isSelected && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
          style={{
            backgroundImage:
              "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-soft)))",
          }}
        />
      )}

      <div className="flex items-start gap-4">
        {/* Match ring */}
        {match && (
          <div className="relative flex-shrink-0">
            <svg width="56" height="56" viewBox="0 0 50 50" className="-rotate-90">
              <circle
                cx="25"
                cy="25"
                r="22"
                fill="none"
                strokeWidth="4"
                className={t.track}
              />
              <circle
                cx="25"
                cy="25"
                r="22"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
                className={cn(t.ring, "transition-[stroke-dashoffset] duration-700")}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("font-display text-sm font-bold", t.text)}>
                {score}
              </span>
            </div>
          </div>
        )}

        {/* Title block */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="flex-1 truncate font-display text-base font-bold leading-tight text-foreground group-hover:text-primary">
              {job.title}
            </h3>
            <ArrowUpRight className="mt-0.5 h-4 w-4 flex-shrink-0 -translate-x-1 translate-y-1 text-muted-foreground opacity-0 transition group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 group-hover:text-primary" />
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{job.company}</span>
            <span aria-hidden className="text-border">·</span>
            <MapPin className="h-3 w-3" />
            <span className="truncate">{job.location}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-tint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Live · {job.sourceName ?? "SearXNG"}
              </span>
            )}
            <span className="rounded-full bg-surface-mid px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {job.type}
            </span>
            {match && match.matchedSkills.length > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  t.chip
                )}
              >
                {score >= 80 ? <Sparkles className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                {match.matchedSkills.length} skill{match.matchedSkills.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
