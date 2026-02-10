import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === JOBS TABLE ===
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(), // e.g., "Full-time", "Contract"
  description: text("description").notNull(),
  requirements: jsonb("requirements").$type<string[]>().notNull(), // Array of bullet points
  skillsRequired: jsonb("skills_required").$type<string[]>().notNull(), // Keywords for matching
  salaryRange: text("salary_range"),
  postedAt: text("posted_at").notNull(), // Simplified for display
});

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true });
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

// === ANALYSIS & MATCHING TYPES ===
// These are not stored in the DB but are used for the API contract
export const parsedCvSchema = z.object({
  skills: z.array(z.string()),
  yearsExperience: z.number(),
  jobTitles: z.array(z.string()),
  techStack: z.array(z.string()),
  rawText: z.string().optional(),
});

export const matchResultSchema = z.object({
  jobId: z.number(),
  matchPercentage: z.number(), // 0-100
  missingSkills: z.array(z.string()),
  matchedSkills: z.array(z.string()),
  strengthAlignment: z.array(z.string()), // "Strong React experience", etc.
  improvements: z.array(z.string()), // "Consider adding TypeScript project", etc.
});

export const analysisResponseSchema = z.object({
  parsedProfile: parsedCvSchema,
  matches: z.array(matchResultSchema),
});

export type ParsedCV = z.infer<typeof parsedCvSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
