import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Building2,
  MapPin,
  ArrowLeft,
  Briefcase,
  Calendar,
} from "lucide-react";

import { Navigation } from "@/components/Navigation";
import { JobCard } from "@/components/JobCard";
import { CVFailureState } from "@/components/CVFailureState";
import { Button } from "@/components/ui/button";
import { useJob } from "@/hooks/use-jobs";
import { analysisResponseSchema, type AnalysisResponse, type MatchResult } from "@shared/schema";
import { cn } from "@/lib/utils";

function scoreTone(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

const toneText = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
} as const;

const toneBg = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
} as const;

export default function Results() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("lastAnalysis");
    if (!stored) {
      setLocation("/");
      return;
    }
    try {
      const result = analysisResponseSchema.safeParse(JSON.parse(stored));
      if (!result.success) {
        sessionStorage.removeItem("lastAnalysis");
        setLocation("/");
        return;
      }
      setData(result.data);
      const sorted = [...result.data.matches].sort(
        (a, b) => b.matchPercentage - a.matchPercentage
      );
      if (sorted[0]) setSelectedJobId(sorted[0].jobId);
    } catch {
      sessionStorage.removeItem("lastAnalysis");
      setLocation("/");
    }
  }, [setLocation]);

  const sortedMatches = useMemo(
    () =>
      data
        ? [...data.matches].sort((a, b) => b.matchPercentage - a.matchPercentage)
        : [],
    [data]
  );

  if (!data) return null;

  if (data.parsedProfile.failure) {
    return (
      <>
        <Navigation />
        <CVFailureState
          failure={data.parsedProfile.failure}
          onRetry={() => setLocation("/")}
        />
      </>
    );
  }

  const selectedMatch = sortedMatches.find((m) => m.jobId === selectedJobId);
  const topScore = sortedMatches[0]?.matchPercentage ?? 0;
  const topTone = scoreTone(topScore);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navigation />

      {/* Stats bar — Stitch "Candidate Profile" rounded card on surface-low */}
      <header className="container px-6 pt-8">
        <button
          onClick={() => setLocation("/")}
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Analyse another CV
        </button>

        <div className="flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-surface-low p-8">
          <div className="flex flex-col gap-1">
            <span className="eyebrow text-on-surface-variant">Candidate Profile</span>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                {data.parsedProfile.jobTitles[0] ?? "Your profile"}
              </h1>
              <span className="h-1.5 w-1.5 rounded-full bg-border/60" />
              <span className="font-medium text-muted-foreground">
                {data.parsedProfile.yearsExperience} yrs exp
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-border/60" />
              <span className="font-medium text-muted-foreground">
                {data.parsedProfile.skills.length} skills
              </span>
            </div>
          </div>

          <div className="flex gap-12">
            <Stat label="Top match" value={`${topScore}%`} tone={topTone} />
            <Stat
              label="Confidence"
              value={`${Math.round(data.parsedProfile.confidenceScore * 100)}%`}
              muted
            />
          </div>
        </div>
      </header>

      <div className="container flex-1 px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Sidebar — profile + matches list */}
          <aside className="lg:col-span-5 xl:col-span-4">
            <ProfileSummary data={data} />

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between px-2">
                <h2 className="eyebrow text-on-surface-variant">Potential Opportunities</h2>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Sorted by score
                </span>
              </div>
              <div className="space-y-3">
                {sortedMatches.map((match) => (
                  <JobListItem
                    key={match.jobId}
                    match={match}
                    isSelected={selectedJobId === match.jobId}
                    onClick={() => setSelectedJobId(match.jobId)}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* Detail */}
          <main className="lg:col-span-7 xl:col-span-8">
            <AnimatePresence mode="wait">
              {selectedMatch ? (
                <motion.div
                  key={selectedMatch.jobId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <JobDetail match={selectedMatch} />
                </motion.div>
              ) : (
                <div className="surface-card flex h-64 items-center justify-center text-sm text-muted-foreground">
                  Select a role to see the breakdown.
                </div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="eyebrow text-on-surface-variant mb-1">{label}</span>
      <span
        className={cn(
          "font-display text-5xl font-black italic tracking-tighter leading-none",
          tone ? toneText[tone] : muted ? "text-primary-soft" : "text-primary"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ProfileSummary({ data }: { data: AnalysisResponse }) {
  const { parsedProfile } = data;
  const initials = (parsedProfile.jobTitles[0] ?? "Candidate")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="surface-card-lift p-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl font-display font-bold text-primary-foreground"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-soft)) 100%)",
          }}
        >
          {initials || "ME"}
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-base font-bold leading-tight">
            {parsedProfile.jobTitles[0] ?? "Your profile"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {parsedProfile.yearsExperience} years experience ·{" "}
            {parsedProfile.skills.length} skills
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h4 className="eyebrow text-muted-foreground">Top skills</h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {parsedProfile.skills.slice(0, 8).map((skill, i) => (
            <span
              key={i}
              className="rounded-full bg-surface-mid px-2.5 py-1 text-[11px] font-medium text-foreground/80"
            >
              {skill}
            </span>
          ))}
          {parsedProfile.skills.length > 8 && (
            <span className="rounded-full bg-primary-tint px-2.5 py-1 text-[11px] font-semibold text-primary">
              +{parsedProfile.skills.length - 8} more
            </span>
          )}
        </div>
      </div>

      {parsedProfile.techStack.length > 0 && (
        <div className="mt-4">
          <h4 className="eyebrow text-muted-foreground">Tech stack</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {parsedProfile.techStack.slice(0, 10).join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}

function JobListItem({
  match,
  isSelected,
  onClick,
}: {
  match: MatchResult;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { data: fullJob } = useJob(match.jobId);

  // Synthesize a Job from the embedded match.job payload when /api/jobs/:id 404s
  // (live SearXNG jobs aren't persisted server-side).
  const displayJob = match.job
    ? {
        id: match.jobId,
        title: match.job.title,
        company: match.job.company,
        location: match.job.location,
        type: "Full-time",
        description: "",
        requirements: [] as string[],
        skillsRequired: match.matchedSkills,
        salaryRange: null,
        postedAt: "Recently",
        sourceUrl: null,
        isLive: match.job.isLive,
        sourceName: match.job.sourceName ?? null,
        externalId: null,
      }
    : fullJob;

  if (!displayJob) {
    return <div className="h-24 animate-pulse rounded-2xl bg-surface-mid" />;
  }

  return (
    <JobCard job={displayJob as any} match={match} isSelected={isSelected} onClick={onClick} />
  );
}

function JobDetail({ match }: { match: MatchResult }) {
  const { data: fetchedJob, isLoading } = useJob(match.jobId);

  const job =
    fetchedJob ??
    (match.job
      ? {
          id: match.jobId,
          title: match.job.title,
          company: match.job.company,
          location: match.job.location,
          type: "Full-time",
          description: "",
          requirements: [] as string[],
          skillsRequired: match.matchedSkills,
          salaryRange: null,
          postedAt: "Recently",
          sourceUrl: null,
          isLive: match.job.isLive,
          sourceName: match.job.sourceName ?? null,
          externalId: null,
        }
      : null);

  if (isLoading && !job) {
    return (
      <div className="surface-card animate-pulse space-y-6 p-8">
        <div className="h-10 w-2/3 rounded-lg bg-surface-mid" />
        <div className="h-4 w-1/3 rounded-lg bg-surface-mid" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-40 rounded-xl bg-surface-mid" />
          <div className="h-40 rounded-xl bg-surface-mid" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="surface-card flex h-64 items-center justify-center text-sm text-muted-foreground">
        Job details unavailable.
      </div>
    );
  }

  const tone = scoreTone(match.matchPercentage);
  const C = 138.23;
  const offset = C - (C * match.matchPercentage) / 100;

  return (
    <div className="space-y-8">
      {/* Stitch detail header — surface-low rounded-2xl, gauge on left */}
      <div className="rounded-2xl bg-surface-low p-8 md:p-10">
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center">
          {/* Score gauge */}
          <div className="relative h-32 w-32 flex-shrink-0">
            <svg width="128" height="128" viewBox="0 0 50 50" className="-rotate-90">
              <circle
                cx="25"
                cy="25"
                r="22"
                fill="none"
                strokeWidth="2.5"
                className="stroke-surface-high"
              />
              <circle
                cx="25"
                cy="25"
                r="22"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
                className={cn("transition-[stroke-dashoffset] duration-700", {
                  "stroke-success": tone === "success",
                  "stroke-warning": tone === "warning",
                  "stroke-danger": tone === "danger",
                })}
                style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary) / 0.2))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={cn(
                  "font-display text-3xl font-black tracking-tighter leading-none",
                  toneText[tone]
                )}
              >
                {match.matchPercentage}%
              </span>
              <span className="mt-1 text-[8px] font-bold uppercase tracking-widest text-on-surface-variant">
                Score
              </span>
            </div>
          </div>

          {/* Title + meta + actions */}
          <div className="flex-grow text-center lg:text-left">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs lg:justify-start">
              {job.isLive && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-2.5 py-1 font-semibold uppercase tracking-wider text-primary">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  Live · {job.sourceName ?? "SearXNG"}
                </span>
              )}
              <span className="rounded-full bg-surface-mid px-2.5 py-1 font-semibold uppercase tracking-wider text-on-surface-variant">
                {job.type}
              </span>
            </div>

            <h2 className="font-display text-3xl font-black tracking-tight leading-tight md:text-4xl text-balance">
              {job.title}
            </h2>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium text-muted-foreground lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span className="text-foreground">{job.company}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {job.postedAt}
              </span>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
              {job.sourceUrl && (
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-gradient inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold hover:scale-[1.02]"
                >
                  Apply with Compass
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <Button
                variant="outline"
                className="h-12 rounded-xl border-border/30 bg-transparent px-6 text-sm font-bold text-primary hover:bg-surface-mid"
              >
                Save match
              </Button>
            </div>

            {job.salaryRange && (
              <div className="mt-6 flex items-center gap-3 text-sm">
                <span className="eyebrow text-on-surface-variant">Salary</span>
                <span className="font-display font-bold">{job.salaryRange}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-column analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <section className="surface-card overflow-hidden">
          <header className="flex items-center justify-between border-b border-border/40 bg-success/5 px-5 py-3">
            <h3 className="inline-flex items-center gap-2 font-display text-sm font-bold text-success">
              <CheckCircle2 className="h-4 w-4" />
              Why you're a match
            </h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", toneBg.success)}>
              {match.matchedSkills.length} skill{match.matchedSkills.length === 1 ? "" : "s"}
            </span>
          </header>
          <div className="space-y-4 p-5">
            {match.strengthAlignment.length > 0 ? (
              <ul className="space-y-2.5">
                {match.strengthAlignment.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success" />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-muted-foreground">No alignment notes returned.</p>
            )}

            {match.matchedSkills.length > 0 && (
              <div className="border-t border-success/20 pt-4">
                <h4 className="eyebrow text-success">Matched skills</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {match.matchedSkills.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Gaps */}
        <section className="surface-card overflow-hidden">
          <header className="flex items-center justify-between border-b border-border/40 bg-warning/5 px-5 py-3">
            <h3 className="inline-flex items-center gap-2 font-display text-sm font-bold text-warning">
              <AlertTriangle className="h-4 w-4" />
              Skill gaps
            </h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", toneBg.warning)}>
              {match.missingSkills.length} missing
            </span>
          </header>
          <div className="p-5">
            {match.missingSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {match.missingSkills.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-success">
                <Sparkles className="h-4 w-4" />
                No critical skills missing.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Improvements */}
      {match.improvements.length > 0 && (
        <section className="surface-card overflow-hidden">
          <header className="flex items-center gap-2 border-b border-border/40 bg-primary-tint px-5 py-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold text-primary">Suggested improvements</h3>
          </header>
          <ol className="space-y-2 p-5">
            {match.improvements.map((imp, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-surface-low p-3 text-sm leading-relaxed text-foreground/90">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-xs font-bold text-primary">
                  {i + 1}
                </span>
                {imp}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Job description / requirements */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="surface-card p-6">
          <h3 className="inline-flex items-center gap-2 font-display text-sm font-bold">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Description
          </h3>
          {job.description ? (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </p>
          ) : (
            <p className="mt-3 text-sm italic text-muted-foreground">
              Full description not available for this listing.
            </p>
          )}
        </div>

        <div className="surface-card p-6">
          <h3 className="font-display text-sm font-bold">Requirements</h3>
          {job.requirements && job.requirements.length > 0 ? (
            <ul className="mt-3 space-y-2.5">
              {(job.requirements as string[]).map((req, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-border" />
                  {req}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm italic text-muted-foreground">
              Requirements not parsed for this listing.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
