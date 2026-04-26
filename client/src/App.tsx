import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

const Results = lazy(() => import("@/pages/Results"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/results">
        <Suspense fallback={<RouteFallback />}>
          <Results />
        </Suspense>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-surface text-on-surface-variant"
    >
      <span className="sr-only">Loading results…</span>
      <div
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <nav aria-label="Accessibility shortcuts">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
        </nav>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
