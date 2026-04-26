import { useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { FileUpload } from "@/components/FileUpload";
import { useAnalyzeCV } from "@/hooks/use-jobs";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Sparkles,
  Target,
  TrendingUp,
  ScanLine,
  Quote,
} from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const analyzeMutation = useAnalyzeCV();

  const handleFileSelect = async (file: File) => {
    try {
      const data = await analyzeMutation.mutateAsync(file);
      sessionStorage.setItem("lastAnalysis", JSON.stringify(data));
      setLocation("/results");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description:
          err instanceof Error ? err.message : "Something went wrong parsing your CV.",
      });
    }
  };

  return (
    <div className="relative isolate min-h-screen bg-surface">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[640px] bg-hero-aura" />

      <Navigation />

      <main className="container px-6 pb-24 pt-12 md:pt-20">
        {/* Hero — asymmetric two-column on desktop */}
        <section className="grid gap-12 md:grid-cols-12 md:items-center">
          <div className="md:col-span-7 md:pr-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-6"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-tint px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered career matching
              </span>

              <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tighter md:text-6xl lg:text-7xl text-balance">
                Find the role you were{" "}
                <span className="relative inline-block">
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary-soft)) 100%)",
                    }}
                  >
                    made for
                  </span>
                  <span
                    aria-hidden
                    className="absolute -bottom-2 left-0 right-0 h-2 rounded-full"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, hsl(var(--primary) / 0.18), hsl(var(--primary-soft) / 0.18))",
                    }}
                  />
                </span>
                .
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
                Drop your CV, get a ranked list of jobs scored against your skills, experience,
                and the gaps you can close.
              </p>

              <div className="flex flex-wrap gap-2 pt-2 text-xs text-muted-foreground">
                {[
                  "PDF or DOCX",
                  "5 MB max",
                  "Free, no signup",
                  "Live results from SearXNG",
                ].map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-card px-3 py-1 shadow-soft ring-1 ring-inset ring-border/50"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="md:col-span-5"
          >
            <FileUpload
              onFileSelect={handleFileSelect}
              isAnalyzing={analyzeMutation.isPending}
              error={analyzeMutation.error ? analyzeMutation.error.message : null}
              progress={analyzeMutation.progress}
              onCancel={() => analyzeMutation.reset()}
            />
          </motion.div>
        </section>
      </main>

      {/* Asymmetric section transition — Stitch "gradient strip" pattern */}
      <div aria-hidden className="h-24 w-full bg-gradient-to-b from-surface to-surface-low" />

      {/* "How it works" — full-bleed surface-low band, staggered editorial pillars */}
      <section className="bg-surface-low py-24">
        <div className="container px-6">
          <div className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <span className="eyebrow text-primary">The Process</span>
              <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight md:text-5xl text-balance">
                From CV to ranked roles<br />in seconds.
              </h2>
            </div>
            <p className="max-w-sm text-lg leading-relaxed text-muted-foreground">
              We've removed the noise of job boards to focus on the signal of your potential.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                Icon: ScanLine,
                title: "Parse your profile",
                desc: "spaCy + heuristics extract skills, experience, and titles from PDF or DOCX with a confidence score.",
                step: "01",
                offset: "",
              },
              {
                Icon: Target,
                title: "Match across boards",
                desc: "Self-hosted SearXNG fans your top role queries across job boards. No tracking, no API keys.",
                step: "02",
                offset: "md:mt-12",
              },
              {
                Icon: TrendingUp,
                title: "Discover ideal roles",
                desc: "Weighted score across skills, experience, and title with a colour-coded ring and gap analysis.",
                step: "03",
                offset: "",
              },
            ].map(({ Icon, title, desc, step, offset }, i) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`relative bg-card rounded-xl p-10 transition-transform duration-500 hover:-translate-y-2 ${offset}`}
              >
                <span
                  className="step-ghost-number absolute right-8 top-8 text-5xl select-none pointer-events-none"
                  aria-hidden
                >
                  {step}
                </span>
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface-mid text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 font-display text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <main className="container px-6 pb-24 pt-24">

        {/* Pull-quote — editorial moment */}
        <section>
          <div className="surface-card-lift overflow-hidden">
            <div className="grid gap-0 md:grid-cols-12">
              <div className="relative md:col-span-4 bg-primary-tint p-8">
                <Quote className="absolute right-6 top-6 h-16 w-16 text-primary/15" />
                <span className="eyebrow text-primary">Why colour-code matches?</span>
              </div>
              <div className="md:col-span-8 p-8 md:p-10">
                <p className="font-display text-xl font-medium leading-relaxed text-foreground md:text-2xl text-balance">
                  An 83% match isn't a number — it's a signal that your skills line up but you're
                  one or two keywords away from the top of the shortlist. Career Compass shows you{" "}
                  <span className="text-primary">which</span> ones.
                </p>
                <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  <span className="font-mono uppercase tracking-widest">scoring rubric</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success" /> 80+
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-warning" /> 50–79
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-danger" /> &lt;50
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 bg-surface-low">
        <div className="container flex flex-col items-start justify-between gap-3 px-6 py-8 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>© Career Compass · open source</span>
          <span className="font-mono">FastAPI · Vite · SearXNG</span>
        </div>
      </footer>
    </div>
  );
}
