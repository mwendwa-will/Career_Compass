import { useState } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { FileUpload } from "@/components/FileUpload";
import { useAnalyzeCV } from "@/hooks/use-jobs";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const analyzeMutation = useAnalyzeCV();
  
  const handleFileSelect = async (file: File) => {
    try {
      const data = await analyzeMutation.mutateAsync(file);
      // Pass data via state location or context
      // Since wouter doesn't support state object in push, we'll store in sessionStorage for demo
      // In a real app, a global store (Zustand/Context) is better
      sessionStorage.setItem('lastAnalysis', JSON.stringify(data));
      setLocation("/results");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : "Something went wrong parsing your CV."
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-6 pt-20 pb-32">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              AI-Powered Career Matching
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground tracking-tight leading-[1.1] mb-6">
              Find the role you were <span className="text-primary italic">made for</span>.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Stop guessing. Upload your CV and let our AI analyze your skills to find jobs where you're a perfect statistical match.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="w-full pt-8"
          >
            <FileUpload 
              onFileSelect={handleFileSelect}
              isAnalyzing={analyzeMutation.isPending}
              error={analyzeMutation.error ? analyzeMutation.error.message : null}
            />
          </motion.div>
        </div>

        {/* Features / Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-20 border-t border-border pt-12"
        >
          {[
            { title: "Skill Extraction", desc: "We identify over 5,000+ technical and soft skills." },
            { title: "Gap Analysis", desc: "See exactly why you didn't match and how to improve." },
            { title: "Smart Matching", desc: "Instant compatibility scores for every open role." },
          ].map((feature, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary">
                  <Check className="w-3 h-3" />
                </div>
                {feature.title}
              </div>
              <p className="text-sm text-muted-foreground pl-7">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Hero Image Background - Subtle */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl opacity-50" />
      </div>
    </div>
  );
}
