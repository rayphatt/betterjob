import { User, UserProfile } from "@/types/user";
import { Job } from "@/types/job";

export interface MatchResult {
  job: Job;
  matchScore: number;
  reasons: string[];
}

/**
 * Calculate job match score based on user profile and job requirements
 */
export function calculateJobMatch(user: User, job: Job): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. Skills match (40% weight)
  const userSkills = user.matchingTags || [];
  const jobTags = job.tags || [];
  
  if (userSkills.length > 0 && jobTags.length > 0) {
    const skillOverlap = userSkills.filter(skill => 
      jobTags.some(tag => 
        tag.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(tag.toLowerCase())
      )
    ).length;
    
    const skillScore = (skillOverlap / Math.max(userSkills.length, jobTags.length)) * 40;
    score += skillScore;
    
    if (skillOverlap > 0) {
      reasons.push(`${skillOverlap} matching skills`);
    }
  }

  // 2. Location match (20% weight)
  const userLocations = user.profile?.locations || [];
  const includeRemote = user.profile?.includeRemote ?? true;
  
  if (job.location) {
    const locationMatch = 
      (job.remote && includeRemote) ||
      userLocations.some(loc => 
        job.location.toLowerCase().includes(loc.toLowerCase()) ||
        loc.toLowerCase().includes(job.location.toLowerCase())
      );
    
    if (locationMatch) {
      score += 20;
      reasons.push(job.remote ? "Remote position" : "Location matches");
    }
  }

  // 3. Salary match (20% weight)
  if (job.salaryMin && job.salaryMax && user.profile?.desiredSalaryMin && user.profile?.desiredSalaryMax) {
    const userMid = (user.profile.desiredSalaryMin + user.profile.desiredSalaryMax) / 2;
    const jobMid = (job.salaryMin + job.salaryMax) / 2;
    
    // Check if job salary overlaps with user's desired range
    const salaryOverlap = 
      (job.salaryMin <= user.profile.desiredSalaryMax && job.salaryMax >= user.profile.desiredSalaryMin);
    
    if (salaryOverlap) {
      const salaryDiff = Math.abs(userMid - jobMid) / userMid;
      const salaryScore = Math.max(0, (1 - salaryDiff) * 20);
      score += salaryScore;
      reasons.push("Salary in your range");
    } else if (job.salaryMin >= user.profile.desiredSalaryMin) {
      // Job pays more than desired (bonus)
      score += 15;
      reasons.push("Above your salary range");
    }
  }

  // 4. Recency (10% weight)
  if (job.postedDate) {
    try {
      // Handle both Timestamp and Date objects
      const postedMillis = job.postedDate.toMillis ? job.postedDate.toMillis() : 
                          (job.postedDate instanceof Date ? job.postedDate.getTime() : 
                          (typeof job.postedDate === 'number' ? job.postedDate : Date.now()));
      const daysSincePosted = (Date.now() - postedMillis) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, (1 - daysSincePosted / 30) * 10);
      score += recencyScore;
      
      if (daysSincePosted < 7) {
        reasons.push("Posted recently");
      }
    } catch (e) {
      // If date parsing fails, skip recency scoring
      console.warn("Error parsing postedDate:", e);
    }
  }

  // 5. Work environment preference alignment (10% weight)
  // Check if user prefers remote and job is remote
  if (user.profile?.workEnvironmentPref === "remote" && job.remote) {
    score += 10;
    reasons.push("Matches your remote preference");
  }
  
  // Check if user prefers hybrid and job is hybrid
  if (user.profile?.workEnvironmentPref === "hybrid" && job.hybrid) {
    score += 10;
    reasons.push("Matches your hybrid preference");
  }
  
  // Growth opportunities based on seniority level
  if (user.profile?.workEnvironmentPref !== "office" && 
      (job.seniorityLevel === "senior" || job.seniorityLevel === "lead")) {
    score += 5;
    reasons.push("Growth opportunity");
  }

  // Round to nearest integer
  const finalScore = Math.round(Math.min(100, Math.max(0, score)));

  return {
    job,
    matchScore: finalScore,
    reasons: reasons.length > 0 ? reasons : ["Potential match"],
  };
}

/**
 * Match jobs for a user and return sorted by match score
 */
export function matchJobsForUser(user: User, jobs: Job[]): MatchResult[] {
  const matches = jobs
    .map(job => calculateJobMatch(user, job))
    .filter(match => match.matchScore > 0) // Only include jobs with some match
    .sort((a, b) => b.matchScore - a.matchScore); // Sort by score descending

  return matches;
}

