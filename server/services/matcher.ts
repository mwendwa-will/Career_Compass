import { Job, MatchResult, ParsedCV } from "@shared/schema";

export function matchProfileToJobs(profile: ParsedCV, jobs: Job[]): MatchResult[] {
  return jobs.map(job => {
    // 1. Calculate Skill Match
    const jobSkills = job.skillsRequired.map(s => s.toLowerCase());
    const userSkills = new Set(profile.skills.map(s => s.toLowerCase()));
    
    const matchedSkills = jobSkills.filter(skill => userSkills.has(skill));
    const missingSkills = jobSkills.filter(skill => !userSkills.has(skill));
    
    // Weighted score: 
    // Skills count for 70%
    // Experience match counts for 30% (simple check)
    
    const skillScore = jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) : 0;
    
    // Experience check (Job doesn't explicitly have years in DB schema structured, but we can infer or ignore for MVP)
    // Let's assume Senior roles need 5+, others 2+
    const isSenior = job.title.toLowerCase().includes("senior");
    const reqYears = isSenior ? 5 : 2;
    const expScore = profile.yearsExperience >= reqYears ? 1 : (profile.yearsExperience / reqYears);
    
    let totalScore = (skillScore * 0.7) + (expScore * 0.3);
    
    // Boost if title matches
    const titleMatch = profile.jobTitles.some(t => job.title.toLowerCase().includes(t));
    if (titleMatch) totalScore += 0.1;

    // Cap at 100% (or 1.0)
    totalScore = Math.min(totalScore, 1);
    
    // Generate Insights
    const strengthAlignment = [];
    if (matchedSkills.length > 3) strengthAlignment.push("Strong technical stack overlap");
    if (titleMatch) strengthAlignment.push("Directly relevant job history");
    if (expScore >= 1) strengthAlignment.push("Meets experience requirements");
    
    const improvements = [];
    if (missingSkills.length > 0) {
      improvements.push(`Consider learning or highlighting: ${missingSkills.slice(0, 3).join(", ")}`);
    }
    if (expScore < 1) {
      improvements.push("This role might require more seniority than detected.");
    }

    return {
      jobId: job.id,
      matchPercentage: Math.round(totalScore * 100),
      missingSkills,
      matchedSkills,
      strengthAlignment,
      improvements
    };
  }).sort((a, b) => b.matchPercentage - a.matchPercentage);
}
