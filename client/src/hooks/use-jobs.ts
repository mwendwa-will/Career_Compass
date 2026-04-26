import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, type AnalysisResponse } from "@shared/routes";

export type WorkArrangement = "remote" | "hybrid" | "onsite";
export type EmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "freelance"
  | "internship";

export interface AnalysisPreferences {
  locations?: string[];
  arrangements?: WorkArrangement[];
  employmentTypes?: EmploymentType[];
}

// Polling configuration for /api/analyze/upload task polling.
const POLL_INTERVAL_MS = 2000;
// 5 minutes worth of polling: covers slow CV parses + SearXNG fan-out
// without leaving the page polling forever if the backend gets stuck.
const MAX_POLL_ATTEMPTS = 150;

// GET /api/jobs
export function useJobs() {
  return useQuery({
    queryKey: [api.jobs.list.path],
    queryFn: async () => {
      const res = await fetch(api.jobs.list.path);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return api.jobs.list.responses[200].parse(await res.json());
    },
  });
}

// GET /api/jobs/:id
export function useJob(id: number) {
  return useQuery({
    queryKey: [api.jobs.get.path, id],
    queryFn: async () => {
      const res = await fetch(api.jobs.get.path.replace(':id', String(id)));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch job");
      return api.jobs.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// POST /api/analyze/upload — uploads, then polls /api/tasks/:id until done.
// Polling is bounded by MAX_POLL_ATTEMPTS and aborted on unmount via an
// AbortController so the fetch loop doesn't outlive the component.
export function useAnalyzeCV() {
  const [progress, setProgress] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight polling when the consumer unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sleep = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new DOMException("Polling aborted", "AbortError"));
        },
        { once: true }
      );
    });

  const mutation = useMutation({
    mutationFn: async (
      input: File | { file: File; preferences?: AnalysisPreferences }
    ) => {
      const file = input instanceof File ? input : input.file;
      const preferences = input instanceof File ? undefined : input.preferences;

      // Cancel any previous run before starting a new one.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;

      setProgress("Uploading...");

      const formData = new FormData();
      formData.append('file', file);
      if (preferences?.locations?.length) {
        formData.append('locations', preferences.locations.join(','));
      }
      if (preferences?.arrangements?.length) {
        formData.append('arrangements', preferences.arrangements.join(','));
      }
      if (preferences?.employmentTypes?.length) {
        formData.append('employment_types', preferences.employmentTypes.join(','));
      }

      const res = await fetch(api.analyze.upload.path, {
        method: 'POST',
        body: formData,
        signal,
      });

      if (res.status === 400) {
        const error = api.analyze.upload.responses[400].parse(await res.json());
        throw new Error(error.message);
      }

      if (res.status !== 202) {
        throw new Error("Failed to analyze CV");
      }

      const { taskId } = api.analyze.upload.responses[202].parse(await res.json());
      setProgress("Queued for analysis...");

      const poll = async (): Promise<AnalysisResponse> => {
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
          const taskRes = await fetch(
            api.tasks.get.path.replace(':id', taskId),
            { signal }
          );
          if (!taskRes.ok) {
            throw new Error("Failed to check task status");
          }
          const task = api.tasks.get.responses[200].parse(await taskRes.json());
          if (task.progress) {
            setProgress(task.progress);
          }
          if (task.status === "completed" && task.result) {
            setProgress("Completed");
            return task.result;
          }
          if (task.status === "failed") {
            throw new Error(task.error || "Analysis failed");
          }
          await sleep(POLL_INTERVAL_MS, signal);
        }
        throw new Error("Analysis is taking longer than expected. Please try again.");
      };

      return poll();
    },
    onSettled: () => {
      setProgress(null);
      abortRef.current = null;
    },
  });

  return { ...mutation, progress };
}
