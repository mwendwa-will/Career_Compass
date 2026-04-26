import { motion } from "framer-motion";
import {
  AlertTriangle,
  FileQuestion,
  RefreshCw,
  Edit3,
  ChevronRight,
  ShieldAlert,
  Image as ImageIcon,
  FileX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FailureReason } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CVFailureStateProps {
  failure: FailureReason;
  onRetry: () => void;
  onManualEntry?: () => void;
}

const failureMeta: Record<
  FailureReason["code"],
  { Icon: React.ComponentType<{ className?: string }>; tone: "warning" | "danger" }
> = {
  UNSUPPORTED_FORMAT: { Icon: FileQuestion, tone: "warning" },
  IMAGE_ONLY: { Icon: ImageIcon, tone: "warning" },
  NON_STANDARD_LAYOUT: { Icon: FileQuestion, tone: "warning" },
  MISSING_SECTIONS: { Icon: AlertTriangle, tone: "warning" },
  UNSUPPORTED_LANGUAGE: { Icon: AlertTriangle, tone: "warning" },
  FILE_SIZE_INVALID: { Icon: FileX, tone: "danger" },
  LOW_CONFIDENCE: { Icon: AlertTriangle, tone: "warning" },
  CORRUPTED_FILE: { Icon: FileX, tone: "danger" },
  PASSWORD_PROTECTED: { Icon: ShieldAlert, tone: "warning" },
};

export function CVFailureState({ failure, onRetry, onManualEntry }: CVFailureStateProps) {
  const meta = failureMeta[failure.code] ?? failureMeta.MISSING_SECTIONS;
  const Icon = meta.Icon;
  const isDanger = meta.tone === "danger";

  return (
    <div className="relative isolate min-h-[calc(100vh-64px)] bg-surface-low">
      <div aria-hidden className="absolute inset-0 -z-10 bg-hero-aura opacity-50" />

      <div className="container max-w-3xl px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div
            className={cn(
              "mb-8 inline-flex items-center gap-2 rounded-full px-3 py-1.5",
              isDanger ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
            )}
          >
            <span className="eyebrow text-[10px] tracking-[0.18em] text-current">
              CV needs attention
            </span>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div
              className={cn(
                "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl",
                isDanger ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
              )}
            >
              <Icon className="h-8 w-8" />
            </div>

            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">
                We couldn't fully read your CV.
              </h1>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground text-balance">
                {failure.message}
              </p>
            </div>
          </div>

          <div className="mt-10 surface-card-lift overflow-hidden">
            <div className="flex items-start gap-4 p-6">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                <ChevronRight className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="eyebrow text-primary">What to try next</h3>
                <p className="mt-2 leading-relaxed text-foreground/90">
                  {failure.actionableStep}
                </p>
              </div>
            </div>

            {failure.suggestedFixes && failure.suggestedFixes.length > 0 && (
              <div className="border-t border-border/40 bg-surface-low p-6">
                <h4 className="eyebrow text-muted-foreground">Quick fixes</h4>
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {failure.suggestedFixes.map((fix, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.05 }}
                      className="flex items-start gap-3 rounded-xl bg-card p-3 shadow-soft"
                    >
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-foreground/90">{fix}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={onRetry}
              className="btn-gradient h-12 gap-2 rounded-xl px-6 text-sm font-semibold border-0"
            >
              <RefreshCw className="h-4 w-4" />
              Try another file
            </Button>
            {failure.allowManualEntry && onManualEntry && (
              <Button
                size="lg"
                variant="outline"
                onClick={onManualEntry}
                className="h-12 gap-2 rounded-xl border-border/60 bg-card px-6 text-sm font-semibold hover:bg-surface-mid"
              >
                <Edit3 className="h-4 w-4" />
                Enter skills manually
              </Button>
            )}
          </div>

          <p className="mt-10 text-xs text-muted-foreground">
            CVs work best as single-column, text-based PDFs exported from Word or Google Docs.
            Image-only scans, encrypted files, and complex multi-column layouts trip up parsers.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
