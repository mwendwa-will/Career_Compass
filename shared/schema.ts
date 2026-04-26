import { z } from "zod";

// === JOB RESPONSE SCHEMA ===
export const jobResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  type: z.string(),
  description: z.string(),
  requirements: z.array(z.string()),
  skillsRequired: z.array(z.string()),
  optionalSkills: z.array(z.string()).nullable().optional(),
  experienceLevel: z.string().nullable().optional(),
  salaryRange: z.string().nullable().optional(),
  postedAt: z.string(),
  sourceUrl: z.string().nullable().optional(),
  sourceName: z.string().nullable().optional(),
  isLive: z.boolean().default(false),
  externalId: z.string().nullable().optional(),
});

export type Job = z.infer<typeof jobResponseSchema>;

// === ANALYSIS & MATCHING TYPES ===
export const failureReasonSchema = z.object({
  code: z.enum([
    "UNSUPPORTED_FORMAT",
    "IMAGE_ONLY",
    "NON_STANDARD_LAYOUT",
    "MISSING_SECTIONS",
    "UNSUPPORTED_LANGUAGE",
    "FILE_SIZE_INVALID",
    "LOW_CONFIDENCE",
    "CORRUPTED_FILE",
    "PASSWORD_PROTECTED"
  ]),
  message: z.string(),
  actionableStep: z.string(),
  allowManualEntry: z.boolean().default(true),
  suggestedFixes: z.array(z.string()).optional(),
});

export type FailureReason = z.infer<typeof failureReasonSchema>;

export const parsedCvSchema = z.object({
  skills: z.array(z.string()),
  yearsExperience: z.number(),
  jobTitles: z.array(z.string()),
  techStack: z.array(z.string()),
  rawText: z.string().nullable().optional(),
  confidenceScore: z.number(), // 0-1
  failure: failureReasonSchema.optional().nullable(),
  location: z.string().optional().nullable(),
  preferredJobType: z.string().optional().nullable(),
});

export type ParsedCV = z.infer<typeof parsedCvSchema>;

export const matchResultSchema = z.object({
  jobId: z.number(),
  matchPercentage: z.number(), // 0-100
  missingSkills: z.array(z.string()),
  matchedSkills: z.array(z.string()),
  strengthAlignment: z.array(z.string()),
  improvements: z.array(z.string()),
  job: z.object({
    title: z.string(),
    company: z.string(),
    location: z.string(),
    isLive: z.boolean(),
    sourceName: z.string().optional().nullable(),
  }).optional(),
});

export type MatchResult = z.infer<typeof matchResultSchema>;

export const analysisResponseSchema = z.object({
  parsedProfile: parsedCvSchema,
  matches: z.array(matchResultSchema),
});

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
