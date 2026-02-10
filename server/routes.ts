import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { parseCV } from "./services/cv_parser";
import { matchProfileToJobs } from "./services/matcher";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Initialize seeded data
  await storage.seedJobs();

  // === JOBS API ===
  app.get(api.jobs.list.path, async (req, res) => {
    const cachedJobs = await storage.getJobs();
    // Also include a "Live" job in the initial list for demonstration
    const liveJobs = await fetchLiveJobs({});
    res.json([...liveJobs, ...cachedJobs]);
  });

  app.get(api.jobs.get.path, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.json(job);
  });

  import { fetchLiveJobs } from "./services/job_search";

// ... inside registerRoutes ...
  app.post(api.analyze.upload.path, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      const originalName = req.file.originalname;
      
      let textContent = "";

      try {
        if (mimeType === 'application/pdf') {
          const pdf = await import('pdf-parse');
          const data = await pdf.default(fileBuffer);
          textContent = data.text;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          textContent = result.value;
        } else if (mimeType.startsWith('text/')) {
          textContent = fileBuffer.toString('utf-8');
        } else {
          return res.status(400).json({
            message: "Unsupported file format",
            code: "UNSUPPORTED_FORMAT"
          });
        }
      } catch (parseErr) {
        return res.status(400).json({
          message: "Failed to read file content",
          code: "NON_STANDARD_LAYOUT"
        });
      }

      // 1. Parse CV with failure detection
      const parsedProfile = await parseCV(textContent, originalName);
      
      if (parsedProfile.failure) {
        return res.json({
          parsedProfile,
          matches: []
        });
      }
      
      // 2. Search for Live Jobs + Cached Jobs
      const liveJobs = await fetchLiveJobs({
        title: parsedProfile.jobTitles[0],
        skills: parsedProfile.skills
      });
      const cachedJobs = await storage.getJobs();
      const allJobs = [...liveJobs, ...cachedJobs];
      
      // 3. Match
      const matches = matchProfileToJobs(parsedProfile, allJobs);

      res.json({
        parsedProfile,
        matches
      });

    } catch (err) {
      console.error("Analysis error:", err);
      res.status(500).json({ message: "Failed to analyze file. Please try again." });
    }
  });

  return httpServer;
}
