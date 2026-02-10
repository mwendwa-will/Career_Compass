import { db } from "./db";
import { jobs, type Job, type InsertJob } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  seedJobs(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs);
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(insertJob).returning();
    return job;
  }

  async seedJobs(): Promise<void> {
    const existing = await this.getJobs();
    if (existing.length > 0) return;

    const realisticJobs: InsertJob[] = [
      {
        title: "Senior Frontend Engineer",
        company: "Vercel",
        location: "Remote",
        type: "Full-time",
        postedAt: "2 days ago",
        description: "We are looking for a Senior Frontend Engineer to help us build the next generation of web development tools. You will work closely with our design and product teams to create beautiful, performant, and accessible user experiences.",
        requirements: [
          "5+ years of experience with React and TypeScript",
          "Deep understanding of web performance and accessibility",
          "Experience with Next.js and Server Components",
          "Strong eye for design details"
        ],
        skillsRequired: ["react", "typescript", "next.js", "css", "html", "figma"],
        salaryRange: "$160k - $220k"
      },
      {
        title: "Full Stack Developer",
        company: "Linear",
        location: "San Francisco, CA",
        type: "Full-time",
        postedAt: "1 week ago",
        description: "Join our small, high-impact team building the standard for issue tracking. We value craft, speed, and quality.",
        requirements: [
          "Strong proficiency in Node.js and React",
          "Experience with PostgreSQL and real-time systems",
          "Ability to own features from design to deployment",
          "Passion for developer tools"
        ],
        skillsRequired: ["node.js", "react", "postgresql", "graphql", "typescript"],
        salaryRange: "$150k - $200k"
      },
      {
        title: "Product Designer",
        company: "Airbnb",
        location: "New York, NY",
        type: "Contract",
        postedAt: "3 days ago",
        description: "Design intuitive and delightful experiences for millions of travelers. You will collaborate with cross-functional teams to define and implement innovative solutions.",
        requirements: [
          "Portfolio demonstrating strong UX/UI skills",
          "Proficiency in Figma and prototyping tools",
          "Experience with design systems",
          "Excellent communication skills"
        ],
        skillsRequired: ["figma", "ui design", "ux research", "prototyping", "design systems"],
        salaryRange: "$140k - $190k"
      },
      {
        title: "Backend Engineer",
        company: "Stripe",
        location: "Dublin, Ireland",
        type: "Full-time",
        postedAt: "5 days ago",
        description: "Scale our financial infrastructure to support millions of businesses. You will work on high-availability, low-latency systems.",
        requirements: [
          "Experience with distributed systems",
          "Proficiency in Java, Go, or Ruby",
          "Strong understanding of database internals",
          "Commitment to reliability and security"
        ],
        skillsRequired: ["java", "go", "ruby", "distributed systems", "postgresql", "api design"],
        salaryRange: "$130k - $180k"
      }
    ];

    for (const job of realisticJobs) {
      await this.createJob(job);
    }
  }
}

export const storage = new DatabaseStorage();
