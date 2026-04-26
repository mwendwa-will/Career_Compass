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
    <div className="flex min-h-screen flex-col bg-surface-low">
      <Navigation />

      {/* Stats bar — at-a-glance result summary */}
      <header className="border-b border-border/40 bg-surface">
        <div className="container px-6 py-6">
          <button
            onClick={() => setLocation("/")}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Analyse another CV
          </button>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="eyebrow">Analysis complete</span>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
                {sortedMatches.length} role{sortedMatches.length === 1 ? "" : "s"} ranked for you.
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.parsedProfile.jobTitles[0]
                  ? `Profile: ${data.parsedProfile.jobTitles[0]}`
                  : "Profile parsed"}
                {" · "}
                {data.parsedProfile.yearsExperience} years experience
                {" · "}
                {data.parsedProfile.skills.length} skills detected
              </p>
            </div>

            <div className="flex items-center gap-6">
              <Stat label="Top match" value={`${topScore}%`} tone={topTone} />
              <Stat
                label="Confidence"
                value={`${Math.round(data.parsedProfile.confidenceScore * 100)}%`}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container flex-1 px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Sidebar — profile + matches list */}
          <aside className="lg:col-span-5 xl:col-span-4">
            <ProfileSummary data={data} />

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="eyebrow">Matches</h2>
                <span className="text-xs text-muted-foreground">
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
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <div className="text-right">
      <div className="eyebrow text-muted-foreground">{label}</div>
      <div
        className={cn(
          "font-display text-3xl font-bold tracking-tight",
          tone ? toneText[tone] : "text-foreground"
        )}
      >
        {value}
      </div>
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
      {/* Header card */}
      <div className="surface-card-lift overflow-hidden">
        <div className="grid gap-6 p-6 md:p-8 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {job.isLive && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-tint px-2.5 py-1 font-semibold uppercase tracking-wider text-primary">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  Live · {job.sourceName ?? "SearXNG"}
                </span>
              )}
              <span className="rounded-full bg-surface-mid px-2.5 py-1 font-semibold uppercase tracking-wider text-muted-foreground">
                {job.type}
              </span>
            </div>

            <h2 className="mt-3 font-display text-2xl font-bold leading-tight md:text-3xl text-balance">
              {job.title}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{job.company}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {job.postedAt}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {job.sourceUrl && (
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-gradient inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
                >
                  Apply on {job.sourceName ?? "source"}
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <Button
                variant="outline"
                className="h-11 rounded-xl border-border/60 bg-card px-5 text-sm font-semibold hover:bg-surface-mid"
              >
                Save match
              </Button>
            </div>
          </div>

          {/* Score gauge */}
          <div className="flex flex-col items-center md:items-end">
            <div className="relative">
              <svg width="128" height="128" viewBox="0 0 50 50" className="-rotate-90">
                <circle
                  cx="25"
                  cy="25"
                  r="22"
                  fill="none"
                  strokeWidth="3"
                  className={cn({
                    "stroke-success/15": tone === "success",
                    "stroke-warning/15": tone === "warning",
                    "stroke-danger/15": tone === "danger",
                  })}
                />
                <circle
                  cx="25"
                  cy="25"
                  r="22"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={offset}
                  className={cn("transition-[stroke-dashoffset] duration-700", {
                    "stroke-success": tone === "success",
                    "stroke-warning": tone === "warning",
                    "stroke-danger": tone === "danger",
                  })}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={cn("font-display text-3xl font-bold leading-none", toneText[tone])}
                >
                  {match.matchPercentage}%
                </span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Match
                </span>
              </div>
            </div>
          </div>
        </div>

        {job.salaryRange && (
          <div className="flex items-center justify-between gap-4 border-t border-border/40 bg-surface-low px-6 py-4 md:px-8">
            <span className="eyebrow text-muted-foreground">Estimated salary</span>
            <span className="font-display text-lg font-bold">{job.salaryRange}</span>
          </div>
        )}
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
