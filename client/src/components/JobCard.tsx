import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, XCircle, MapPin, Building2, Briefcase } from "lucide-react";
import type { Job, MatchResult } from "@shared/schema";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  match?: MatchResult;
  isSelected?: boolean;
  onClick: () => void;
}

export function JobCard({ job, match, isSelected, onClick }: JobCardProps) {
  const score = match?.matchPercentage || 0;
  
  // Determine color based on score
  let scoreColor = "text-muted-foreground";
  let ringColor = "ring-muted";
  
  if (score >= 80) {
    scoreColor = "text-emerald-600";
    ringColor = "ring-emerald-500";
  } else if (score >= 50) {
    scoreColor = "text-amber-600";
    ringColor = "ring-amber-500";
  } else if (match) {
    scoreColor = "text-rose-600";
    ringColor = "ring-rose-500";
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "group relative p-6 bg-card rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden",
        isSelected 
          ? "border-primary ring-1 ring-primary shadow-lg scale-[1.02]" 
          : "border-border hover:border-primary/30 hover:shadow-md"
      )}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground leading-tight group-hover:text-primary transition-colors">
              {job.title}
            </h3>
            <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              {job.company}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
              <MapPin className="w-3 h-3" />
              {job.location}
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
              <Briefcase className="w-3 h-3" />
              {job.type}
            </span>
          </div>
        </div>

        {match && (
          <div className="flex flex-col items-center">
            <div className={cn(
              "relative flex items-center justify-center w-14 h-14 rounded-full bg-background border-4 text-sm font-bold shadow-sm transition-colors",
              scoreColor,
              match.matchPercentage >= 80 ? "border-emerald-100" : match.matchPercentage >= 50 ? "border-amber-100" : "border-rose-100"
            )}>
              {match.matchPercentage}%
              
              {/* Animated Ring for High Match */}
              {match.matchPercentage >= 80 && (
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="text-emerald-500"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="transparent"
                    r="46"
                    cx="50"
                    cy="50"
                    strokeDasharray="289.02652413026095"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    style={{ 
                      strokeDashoffset: 289 - (289 * match.matchPercentage) / 100,
                      transition: "stroke-dashoffset 1s ease-out" 
                    }}
                  />
                </svg>
              )}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-2">
              Match
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-border/50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-xs text-muted-foreground font-medium">View Analysis</span>
        <ArrowRight className="w-4 h-4 text-primary" />
      </div>
    </motion.div>
  );
}
