import { useRef, useState } from "react";
import { Upload, FileText, Loader2, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
  error?: string | null;
  progress?: string | null;
  onCancel?: () => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function FileUpload({
  onFileSelect,
  isAnalyzing,
  error,
  progress,
  onCancel,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Unsupported file",
        description: "Upload a PDF or DOCX file (max 5 MB).",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 5 MB.",
      });
      return;
    }
    setFileName(file.name);
    onFileSelect(file);
  };

  const triggerUpload = () => inputRef.current?.click();

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait" initial={false}>
        {isAnalyzing ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="surface-card-lift overflow-hidden p-8 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-primary/30 blur-md animate-pulse"
                />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary-tint">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-bold leading-tight">
                  Reading your CV
                </h3>
                <p className="mt-1 text-sm text-muted-foreground truncate">
                  {fileName ?? "your file"}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
                    <span className="relative rounded-full bg-primary h-2 w-2" />
                  </span>
                  {progress ?? "Working…"}
                </div>
              </div>
              {onCancel && (
                <button
                  onClick={onCancel}
                  aria-label="Cancel"
                  className="rounded-lg p-2 text-muted-foreground hover:bg-surface-mid hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Indeterminate progress bar */}
            <div className="mt-6 h-1 overflow-hidden rounded-full bg-surface-mid">
              <div
                className="h-full w-1/3 rounded-full"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-soft)))",
                  animation: "shimmer 2s linear infinite",
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "group relative overflow-hidden rounded-2xl p-10 transition-all duration-300",
                "bg-card shadow-soft",
                "ring-1 ring-inset ring-border/60",
                "focus-within:ring-primary/40 focus-within:shadow-lift",
                dragActive && "ring-2 ring-primary bg-primary-tint",
                error && "ring-destructive/40 bg-destructive/5"
              )}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx"
                onChange={handleChange}
              />

              <div className="flex flex-col items-center gap-5 text-center">
                <div
                  className={cn(
                    "relative flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
                    error
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary-tint text-primary group-hover:scale-105"
                  )}
                >
                  {error ? (
                    <AlertTriangle className="h-7 w-7" />
                  ) : (
                    <Upload className="h-7 w-7" strokeWidth={2} />
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="font-display text-xl font-bold">
                    {error ? "Something went wrong" : "Drop your CV here"}
                  </h2>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    {error ?? "PDF or DOCX, up to 5 MB. We'll extract your skills and match you to open roles."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerUpload();
                  }}
                  className="btn-gradient mt-1 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
                >
                  <FileText className="h-4 w-4" />
                  {error ? "Try another file" : "Choose a file"}
                </button>

                <p className="text-xs text-muted-foreground/80">
                  Or drag and drop. Your file never leaves the analysis pipeline.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
