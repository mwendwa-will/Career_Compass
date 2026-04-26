import { motion } from "framer-motion";
import { AlertCircle, FileQuestion, RefreshCw, Edit3, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FailureReason } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CVFailureStateProps {
  failure: FailureReason;
  onRetry: () => void;
  onManualEntry?: () => void;
}

const failureIcons = {
  UNSUPPORTED_FORMAT: FileQuestion,
  IMAGE_ONLY: FileQuestion,
  NON_STANDARD_LAYOUT: FileQuestion,
  MISSING_SECTIONS: AlertCircle,
  UNSUPPORTED_LANGUAGE: AlertCircle,
  FILE_SIZE_INVALID: AlertCircle,
  LOW_CONFIDENCE: AlertCircle,
  CORRUPTED_FILE: FileQuestion,
  PASSWORD_PROTECTED: FileQuestion,
};

const failureColors = {
  UNSUPPORTED_FORMAT: "text-orange-500",
  IMAGE_ONLY: "text-orange-500",
  NON_STANDARD_LAYOUT: "text-blue-500",
  MISSING_SECTIONS: "text-yellow-500",
  UNSUPPORTED_LANGUAGE: "text-purple-500",
  FILE_SIZE_INVALID: "text-red-500",
  LOW_CONFIDENCE: "text-yellow-500",
  CORRUPTED_FILE: "text-red-500",
  PASSWORD_PROTECTED: "text-orange-500",
};

export function CVFailureState({ failure, onRetry, onManualEntry }: CVFailureStateProps) {
  const Icon = failureIcons[failure.code] || AlertCircle;
  const iconColor = failureColors[failure.code] || "text-muted-foreground";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-2xl"
        >
          {/* Icon Header */}
          <div className="flex justify-center  mb-8">
            <div className={cn(
              "h-20 w-20 rounded-full flex items-center justify-center",
              "bg-muted/50 backdrop-blur-sm ring-1 ring-border"
            )}>
              <Icon className={cn("h-10 w-10", iconColor)} />
            </div>
          </div>

          {/* Main Content */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              We need your help
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              {failure.message}
            </p>
          </div>

          {/* Actionable Step Card */}
          <Card className="mb-8 border-2">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    What to do next
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {failure.actionableStep}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Fixes */}
          {failure.suggestedFixes && failure.suggestedFixes.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Quick Fixes
              </h3>
              <div className="grid gap-3">
                {failure.suggestedFixes.map((fix, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg",
                      "bg-muted/30 border border-border/50",
                      "hover:bg-muted/50 transition-colors"
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-foreground">{fix}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={onRetry}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Another File
            </Button>
            
            {failure.allowManualEntry && onManualEntry && (
              <Button
                size="lg"
                variant="outline"
                onClick={onManualEntry}
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Enter Skills Manually
              </Button>
            )}
          </div>

          {/* Support Text */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Having trouble? Most CVs work best as single-column, text-based PDFs exported from Word or Google Docs.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
