import { ParsedCV } from "@shared/schema";

// Heuristic-based parser
// In a real production app, this would use OCR/LLMs (e.g., OpenAI) or dedicated libraries like pdf-parse/mammoth
// For this MVP, we will simulate extraction or use basic regex on text if we had the libraries installed.
// We will assume the text content is passed to this service (extracted by routes)

export async function parseCV(text: string, originalFilename: string): Promise<ParsedCV> {
  const normalizedText = text.toLowerCase();
  
  // 1. Extract Skills (Keyword matching from a common tech list)
  const commonSkills = [
    "react", "typescript", "javascript", "node.js", "python", "go", "java", "ruby", "rust",
    "css", "html", "sql", "postgresql", "mongodb", "aws", "docker", "kubernetes", "git",
    "figma", "graphql", "next.js", "express", "redux", "tailwind"
  ];

  const foundSkills = commonSkills.filter(skill => normalizedText.includes(skill));

  // 2. Extract Years of Experience (Heuristic: Look for "X years", dates)
  // Simple regex for "X years" or date ranges
  let yearsExperience = 0;
  
  // Look for "X years"
  const yearsRegex = /(\d+)\+?\s*years?/g;
  let match;
  while ((match = yearsRegex.exec(normalizedText)) !== null) {
    const years = parseInt(match[1]);
    if (years > yearsExperience && years < 30) { // Cap at 30 to avoid false positives like "2020 years"
      yearsExperience = years;
    }
  }

  // Fallback: Calculate from date ranges (simple implementation)
  // e.g., "2018 - 2022"
  const dateRangeRegex = /(20\d{2})\s*-\s*(20\d{2}|present)/g;
  let minYear = 2030;
  let maxYear = 2000;
  let hasDates = false;
  
  while ((match = dateRangeRegex.exec(normalizedText)) !== null) {
    hasDates = true;
    const start = parseInt(match[1]);
    const end = match[2] === 'present' ? new Date().getFullYear() : parseInt(match[2]);
    if (start < minYear) minYear = start;
    if (end > maxYear) maxYear = end;
  }

  if (hasDates && maxYear >= minYear) {
    const calcYears = maxYear - minYear;
    if (calcYears > yearsExperience) yearsExperience = calcYears;
  }

  // 3. Extract Job Titles (Heuristic: Common titles)
  const commonTitles = [
    "software engineer", "frontend developer", "backend developer", "full stack developer", 
    "product designer", "product manager", "devops engineer", "data scientist", "web developer"
  ];
  
  const foundTitles = commonTitles.filter(title => normalizedText.includes(title));

  return {
    skills: [...new Set(foundSkills)], // Dedupe
    yearsExperience: yearsExperience || 1, // Default to 1 if nothing found
    jobTitles: [...new Set(foundTitles)],
    techStack: [...new Set(foundSkills)], // Using skills as tech stack for simplicity
    rawText: text.substring(0, 500) + "..." // Store snippet
  };
}
