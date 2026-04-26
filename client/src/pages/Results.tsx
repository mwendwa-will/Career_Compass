import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { JobCard } from "@/components/JobCard";
import { CVFailureState } from "@/components/CVFailureState";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, AlertTriangle, Download, ExternalLink } from "lucide-react";
import type { AnalysisResponse } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Results() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  useEffect(() => {
    // Retrieve data passed from Home
    const stored = sessionStorage.getItem('lastAnalysis');
    if (!stored) {
      setLocation("/");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setData(parsed);
      // Select best match by default
      if (parsed.matches && parsed.matches.length > 0) {
        // Sort by match percentage descending
        const sorted = [...parsed.matches].sort((a, b) => b.matchPercentage - a.matchPercentage);
        setSelectedJobId(sorted[0].jobId);
      }
    } catch (e) {
      setLocation("/");
    }
  }, [setLocation]);

  if (!data) return null;

  // Handle CV parsing failure
  if (data.parsedProfile.failure) {
    return (
      <>
        <Navigation />
        <CVFailureState
          failure={data.parsedProfile.failure}
          onRetry={() => setLocation("/")}
          onManualEntry={() => {
            // TODO: Implement manual skill entry flow
            console.log("Manual entry not yet implemented");
          }}
        />
      </>
    );
  }

  const selectedMatch = data.matches.find(m => m.jobId === selectedJobId);
  const sortedMatches = [...data.matches].sort((a, b) => b.matchPercentage - a.matchPercentage);
  
  // In a real app, we'd fetch the full job details based on ID. 
  // For this demo, we'll assume the match object has what we need or fetch it via a hook if needed.
  // We'll fetch the job details separately in the detail view component.

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-64px)]">
        
        {/* Sidebar: Parsed Profile & Job List */}
        <div className="w-full lg:w-[450px] border-r border-border bg-muted/10 flex flex-col overflow-hidden">
          {/* Profile Summary Header */}
          <div className="p-6 border-b border-border bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-lg">
                ME
              </div>
              <div>
                <h2 className="font-semibold text-foreground leading-tight">Your Profile</h2>
                <p className="text-xs text-muted-foreground">{data.parsedProfile.jobTitles[0] || "Candidate"} • {data.parsedProfile.yearsExperience} Years Exp.</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {data.parsedProfile.skills.slice(0, 5).map((skill, i) => (
                <span key={i} className="px-2 py-1 rounded text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wide">
                  {skill}
                </span>
              ))}
              {data.parsedProfile.skills.length > 5 && (
                <span className="px-2 py-1 rounded text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wide">
                  +{data.parsedProfile.skills.length - 5}
                </span>
              )}
            </div>
          </div>

          {/* Job List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
              Best Matches ({sortedMatches.length})
            </h3>
            
            <div className="space-y-3">
              {sortedMatches.map((match) => (
                // We need to fetch basic job info here. 
                // Since this is a demo, we'll use a wrapper that fetches the job info or assumes it's available.
                // For optimal performance, the /analyze endpoint should return basic job info with the match.
                // Here we'll rely on the separate JobCard fetching pattern or pass mock data if needed.
                <JobListItem 
                  key={match.jobId} 
                  match={match} 
                  isSelected={selectedJobId === match.jobId}
                  onClick={() => setSelectedJobId(match.jobId)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Content: Job Detail & Analysis */}
        <div className="flex-1 overflow-y-auto bg-background p-6 lg:p-10">
          {selectedMatch ? (
            <JobDetailView match={selectedMatch} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a job to view analysis
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrapper to fetch job data for the list item
import { useJob } from "@/hooks/use-jobs";
import type { MatchResult } from "@shared/schema";

function JobListItem({ match, isSelected, onClick }: { match: MatchResult, isSelected: boolean, onClick: () => void }) {
  // Use embedded job info if available, otherwise fetch
  const { data: fullJob } = useJob(match.jobId);
  
  // Create a minimal job object from match data if available
  const displayJob = match.job 
    ? {
        id: match.jobId,
        title: match.job.title,
        company: match.job.company,
        location: match.job.location,
        type: "Full-time", // Default, will be replaced by full data if fetched
        description: "",
        requirements: [],
        skillsRequired: match.matchedSkills,
        salaryRange: null,
        postedAt: "Recently",
        sourceUrl: null,
        isLive: match.job.isLive,
        sourceName: match.job.sourceName,
        externalId: null
      }
    : fullJob;
  
  if (!displayJob) return <div className="h-24 rounded-xl bg-muted/20 animate-pulse" />;
  
  return (
    <JobCard 
      job={displayJob as any} 
      match={match} 
      isSelected={isSelected} 
      onClick={onClick}
    />
  );
}

function JobDetailView({ match }: { match: any }) {
  const { data: job, isLoading } = useJob(match.jobId);

  if (isLoading || !job) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 bg-muted/20 w-1/2 rounded-lg" />
        <div className="h-4 bg-muted/20 w-1/3 rounded-lg" />
        <div className="grid grid-cols-2 gap-8 mt-12">
          <div className="h-64 bg-muted/20 rounded-xl" />
          <div className="h-64 bg-muted/20 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      key={job.id}
      className="max-w-4xl mx-auto space-y-10"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-6 border-b border-border pb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">{job.title}</h1>
          <div className="text-lg text-muted-foreground flex items-center gap-2">
            <span className="font-medium text-foreground">{job.company}</span>
            <span className="text-border">•</span>
            <span>{job.location}</span>
            <span className="text-border">•</span>
            <span>{job.type}</span>
          </div>
          <div className="mt-6 flex gap-3">
             <Button className="bg-primary hover:bg-primary/90 text-white rounded-lg px-6 py-6 font-semibold shadow-lg shadow-primary/20 transition-all hover:-translate-y-1">
               Apply for this Role
               <ExternalLink className="ml-2 w-4 h-4" />
             </Button>
             <Button variant="outline" className="rounded-lg px-6 py-6 border-border hover:bg-muted/50">
               Save Match
             </Button>
          </div>
        </div>
        
        <div className="flex flex-col items-center p-6 bg-card rounded-2xl border border-border shadow-sm min-w-[160px]">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Match Score</span>
          <div className={cn(
            "text-5xl font-bold font-display",
            match.matchPercentage >= 80 ? "text-emerald-600" : match.matchPercentage >= 50 ? "text-amber-600" : "text-rose-600"
          )}>
            {match.matchPercentage}%
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left: Analysis */}
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Why you're a match
            </h3>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-6 space-y-3">
              {match.strengthAlignment.map((strength: string, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                  <p className="text-sm text-foreground/80">{strength}</p>
                </div>
              ))}
              {match.matchedSkills.length > 0 && (
                <div className="pt-3 mt-3 border-t border-emerald-200/50">
                   <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Matched Skills</p>
                   <div className="flex flex-wrap gap-2">
                     {match.matchedSkills.map((skill: string, i: number) => (
                       <span key={i} className="px-2 py-1 bg-white border border-emerald-100 rounded text-xs text-emerald-800 font-medium">
                         {skill}
                       </span>
                     ))}
                   </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Missing Skills
            </h3>
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-6">
              {match.missingSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {match.missingSkills.map((skill: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-white border border-amber-100 rounded-md text-sm text-amber-800 font-medium shadow-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-amber-800 italic">No critical skills missing!</p>
              )}
            </div>
          </section>

          <section>
             <h3 className="text-lg font-bold font-display mb-4">Suggested Improvements</h3>
             <ul className="space-y-3">
               {match.improvements.map((imp: string, i: number) => (
                 <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
                   <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                     {i + 1}
                   </span>
                   {imp}
                 </li>
               ))}
             </ul>
          </section>
        </div>

        {/* Right: Job Details */}
        <div className="space-y-8">
           <section>
             <h3 className="text-lg font-bold font-display mb-4">Description</h3>
             <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
               {job.description}
             </p>
           </section>

           <section>
             <h3 className="text-lg font-bold font-display mb-4">Requirements</h3>
             <ul className="space-y-3">
               {(job.requirements as string[]).map((req, i) => (
                 <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                   <div className="w-1.5 h-1.5 rounded-full bg-border mt-2" />
                   {req}
                 </li>
               ))}
             </ul>
           </section>
           
           {job.salaryRange && (
             <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
               <span className="text-sm font-medium text-primary">Estimated Salary</span>
               <span className="font-display font-bold text-lg text-foreground">{job.salaryRange}</span>
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
}
