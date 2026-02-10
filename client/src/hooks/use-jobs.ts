import { useQuery, useMutation } from "@tanstack/react-query";
import { api, type AnalysisResponse } from "@shared/routes";

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

// POST /api/analyze/upload
export function useAnalyzeCV() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(api.analyze.upload.path, {
        method: 'POST',
        body: formData,
        // Content-Type header is set automatically by browser with boundary for FormData
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.analyze.upload.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to analyze CV");
      }

      return api.analyze.upload.responses[200].parse(await res.json());
    },
  });
}
