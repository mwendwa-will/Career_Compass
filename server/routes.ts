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
    const jobs = await storage.getJobs();
    res.json(jobs);
  });

  app.get(api.jobs.get.path, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.json(job);
  });

  // === ANALYZE API ===
  app.post(api.analyze.upload.path, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      const originalName = req.file.originalname;
      
      let textContent = "";

      // Dynamic import to avoid issues if packages aren't installed yet (though we will install them)
      if (mimeType === 'application/pdf') {
        const pdf = await import('pdf-parse');
        const data = await pdf.default(fileBuffer);
        textContent = data.text;
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        textContent = result.value;
      } else {
        // Fallback for text files or unknown types (treat as text)
        textContent = fileBuffer.toString('utf-8');
      }

      // 1. Parse CV
      const parsedProfile = await parseCV(textContent, originalName);
      
      // 2. Get All Jobs
      const jobs = await storage.getJobs();
      
      // 3. Match
      const matches = matchProfileToJobs(parsedProfile, jobs);

      // Return combined response
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
