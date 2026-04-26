import { motion } from "framer-motion";
import {
  AlertTriangle,
  FileQuestion,
  RefreshCw,
  Edit3,
  ShieldAlert,
  Image as ImageIcon,
  FileX,
  FileText,
  ScanText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FailureReason } from "@shared/schema";

interface CVFailureStateProps {
  failure: FailureReason;
  onRetry: () => void;
  onManualEntry?: () => void;
}

const failureMeta: Record<
  FailureReason["code"],
  {
    Icon: React.ComponentType<{ className?: string }>;
    headline: string;
    explainer: string;
  }
> = {
  UNSUPPORTED_FORMAT: {
    Icon: FileQuestion,
    headline: "Unsupported file format.",
    explainer:
      "We only accept text-based PDF and DOCX files. The file you uploaded uses a format our parser can't read.",
  },
  IMAGE_ONLY: {
    Icon: ImageIcon,
    headline: "Your CV is image-only.",
    explainer:
      "The internal structure appears to be flattened images rather than digital text. This usually happens with scanned resumes or files printed to image.",
  },
  NON_STANDARD_LAYOUT: {
    Icon: FileQuestion,
    headline: "The layout is non-standard.",
    explainer:
      "Multi-column layouts, heavy graphics, or unusual section ordering can confuse our parser. A simpler, single-column template extracts much more cleanly.",
  },
  MISSING_SECTIONS: {
    Icon: AlertTriangle,
    headline: "We couldn't find a Skills section.",
    explainer:
      "Your CV parsed, but our matcher relies on a clearly labelled Skills (or Tech Stack) section to score you against open roles.",
  },
  UNSUPPORTED_LANGUAGE: {
    Icon: AlertTriangle,
    headline: "We don't support this language yet.",
    explainer:
      "Career Compass currently only matches English-language CVs. Multilingual support is on the roadmap.",
  },
  FILE_SIZE_INVALID: {
    Icon: FileX,
    headline: "The file is too short or empty.",
    explainer:
      "The upload succeeded but contained almost no extractable text. Either the document is blank, the export stripped its content, or the file is much smaller than a typical CV.",
  },
  LOW_CONFIDENCE: {
    Icon: AlertTriangle,
    headline: "Our parser isn't confident.",
    explainer:
      "We extracted some text, but couldn't reliably identify your skills, titles, or years of experience. Matching against this profile would be misleading.",
  },
  CORRUPTED_FILE: {
    Icon: FileX,
    headline: "The file appears corrupted.",
    explainer:
      "The upload completed but the file's internal structure is damaged. Re-export the document from its source application and try again.",
  },
  PASSWORD_PROTECTED: {
    Icon: ShieldAlert,
    headline: "This file is password-protected.",
    explainer:
      "Career Compass can't open encrypted documents. Remove the password from your CV and re-upload \u2014 your file never leaves the analysis pipeline.",
  },
};

const QUICK_FIXES = [
  { Icon: FileText, label: "Re-export PDF" },
  { Icon: FileText, label: "Use .DOCX" },
  { Icon: ScanText, label: "OCR Check" },
  { Icon: Edit3, label: "Manual Entry" },
];

export function CVFailureState({ failure, onRetry, onManualEntry }: CVFailureStateProps) {
  const meta = failureMeta[failure.code] ?? failureMeta.MISSING_SECTIONS;
  const { Icon, headline, explainer } = meta;
  const fixes =
    failure.suggestedFixes && failure.suggestedFixes.length > 0
      ? failure.suggestedFixes.slice(0, 3)
      : [
          "Ensure you aren't uploading a photo of your resume. Use the original digital file.",
          "Open the file and try to highlight the text. If you can't highlight it, our AI can't read it.",
          "Export as PDF directly from Google Docs, Microsoft Word, or Canva using the \"Standard PDF\" setting.",
        ];

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-surface">
      {/* Header band — surface-low, eyebrow + display headline + status pill */}
      <header className="bg-surface-low px-6 py-20">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-3">
            <span className="eyebrow text-primary">Analysis Halted</span>
            <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl text-balance">
              {headline}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
              {failure.message}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full bg-card px-4 py-2 ring-1 ring-inset ring-border/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Status code
            </span>
            <code className="font-mono text-sm font-medium text-primary">{failure.code}</code>
          </div>
        </div>
      </header>

      {/* Main 7/5 grid */}
      <main className="flex-grow px-6 py-16">
        <div className="mx-auto grid max-w-[1120px] gap-8 lg:grid-cols-12">
          {/* LEFT 7/12 */}
          <div className="space-y-8 lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 rounded-2xl bg-card p-8"
            >
              <div className="flex items-center gap-4 text-tertiary">
                <Icon className="h-9 w-9" />
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  What happened
                </h2>
              </div>
              <div className="space-y-4 leading-relaxed text-muted-foreground">
                <p>{explainer}</p>
                <p className="text-foreground">{failure.actionableStep}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="rounded-2xl bg-surface-mid p-8"
            >
              <h3 className="mb-8 font-display text-lg font-bold">Try this next</h3>
              <div className="space-y-8">
                {fixes.map((fix, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed">
                      <span className="font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{fix}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* RIGHT 5/12 */}
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-5"
          >
            <div className="space-y-8 rounded-2xl bg-surface-low p-8">
              <h3 className="font-display text-lg font-bold">Suggested fixes</h3>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_FIXES.map(({ Icon: FixIcon, label }) => (
                  <button
                    key={label}
                    type="button"
                    className="flex flex-col gap-2 rounded-xl bg-card p-4 text-left text-xs font-bold text-primary ring-1 ring-inset ring-border/30 transition-colors hover:bg-primary-fixed"
                  >
                    <FixIcon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  onClick={onRetry}
                  className="btn-gradient flex h-14 w-full items-center justify-center gap-3 rounded-xl text-sm font-bold border-0"
                >
                  <RefreshCw className="h-4 w-4" />
                  Upload another CV
                </Button>
                {failure.allowManualEntry && onManualEntry && (
                  <Button
                    onClick={onManualEntry}
                    variant="ghost"
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-primary hover:bg-card"
                  >
                    Enter skills manually
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.aside>
        </div>
      </main>

      <footer className="bg-surface-low px-6 py-8">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-3 text-xs text-muted-foreground md:flex-row md:items-center">
          <span className="font-mono">FastAPI · Vite · SearXNG · spaCy</span>
          <span>
            Need help?{" "}
            <a
              className="text-primary hover:underline"
              href="mailto:hello@careercompass.io"
            >
              hello@careercompass.io
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
