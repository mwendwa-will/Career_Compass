import { Job, InsertJob } from "@shared/schema";
import { storage } from "../storage";

export interface JobSearchOptions {
  title?: string;
  skills?: string[];
  location?: string;
}

export async function fetchLiveJobs(options: JobSearchOptions): Promise<Job[]> {
  try {
    // In a real-world scenario, this would call APIs like LinkedIn, Indeed, or use a scraper.
    // For this implementation, we simulate fetching from a live source with a delay.
    // We then normalize it into our internal format.

    // Simulated fetch logic
    const mockLiveJobs: InsertJob[] = [
      {
        title: `${options.title || "Software Engineer"} (Live)`,
        company: "Innovation Labs",
        location: options.location || "Remote",
        type: "Full-time",
        postedAt: "Just now",
        description: "Seeking a talented individual to join our fast-paced live production team.",
        requirements: ["Experience with real-time systems", "Strong communication skills"],
        skillsRequired: options.skills?.slice(0, 3) || ["javascript", "node.js"],
        salaryRange: "$140k - $180k",
        sourceUrl: "https://example.com/jobs/live-1",
        isLive: true,
        externalId: "live_ext_123"
      }
    ];

    // Return mock data for now, signaling it's "Live"
    return mockLiveJobs.map((j, i) => ({ ...j, id: 1000 + i } as Job));

  } catch (error) {
    console.error("Live job fetch failed, falling back to cached data:", error);
    // Fallback to cached/seeded data if live fetch fails
    return await storage.getJobs();
  }
}
