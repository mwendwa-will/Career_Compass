import { ParsedCV } from "@shared/schema";

// Heuristic-based parser
// In a real production app, this would use OCR/LLMs (e.g., OpenAI) or dedicated libraries like pdf-parse/mammoth
// For this MVP, we will simulate extraction or use basic regex on text if we had the libraries installed.
// We will assume the text content is passed to this service (extracted by routes)

export async function parseCV(text: string, originalFilename: string): Promise<ParsedCV> {
  const normalizedText = text.toLowerCase();
  
  // Basic validation check for content
  if (!text || text.trim().length < 50) {
    return {
      skills: [],
      yearsExperience: 0,
      jobTitles: [],
      techStack: [],
      confidenceScore: 0,
      failure: {
        code: "FILE_SIZE_INVALID",
        message: "The uploaded document appears to be too short to be a valid CV.",
        actionableStep: "Please ensure you are uploading a complete CV with detailed sections."
      }
    };
  }

  // Check for mostly image-based (low ratio of text to expected length or specific markers)
  // This is a simple heuristic
  if (text.length > 500 && text.replace(/\s/g, '').length < 100) {
    return {
      skills: [],
      yearsExperience: 0,
      jobTitles: [],
      techStack: [],
      confidenceScore: 0,
      failure: {
        code: "IMAGE_ONLY",
        message: "We couldn't extract enough text from this file. It might be a scanned image.",
        actionableStep: "Try exporting your CV as a text-based PDF from Word or Google Docs."
      }
    };
  }

  // 1. Extract Skills
  const commonSkills = [
    "react", "typescript", "javascript", "node.js", "python", "go", "java", "ruby", "rust",
    "css", "html", "sql", "postgresql", "mongodb", "aws", "docker", "kubernetes", "git",
    "figma", "graphql", "next.js", "express", "redux", "tailwind"
  ];

  const foundSkills = commonSkills.filter(skill => normalizedText.includes(skill));

  // Confidence heuristic: ratio of found skills/titles to text length
  let confidenceScore = Math.min(1, (foundSkills.length * 0.1) + 0.2);

  if (foundSkills.length === 0) {
    return {
      skills: [],
      yearsExperience: 0,
      jobTitles: [],
      techStack: [],
      confidenceScore: 0.1,
      failure: {
        code: "MISSING_SECTIONS",
        message: "We couldn't identify any technical skills in your CV.",
        actionableStep: "Make sure your CV has a clearly labeled 'Skills' or 'Expertise' section."
      }
    };
  }

  // 2. Extract Years of Experience
  let yearsExperience = 0;
  
  const yearsRegex = /(\d+)\+?\s*years?/g;
  let match;
  while ((match = yearsRegex.exec(normalizedText)) !== null) {
    const years = parseInt(match[1]);
    if (years > yearsExperience && years < 30) {
      yearsExperience = years;
    }
  }

  // 3. Extract Job Titles
  const commonTitles = [
    "software engineer", "frontend developer", "backend developer", "full stack developer", 
    "product designer", "product manager", "devops engineer", "data scientist", "web developer"
  ];
  
  const foundTitles = commonTitles.filter(title => normalizedText.includes(title));

  return {
    skills: Array.from(new Set(foundSkills)),
    yearsExperience: yearsExperience || 1,
    jobTitles: Array.from(new Set(foundTitles)),
    techStack: Array.from(new Set(foundSkills)),
    rawText: text.substring(0, 500) + "...",
    confidenceScore: Math.round(confidenceScore * 100) / 100
  };
}
