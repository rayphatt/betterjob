import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  selectedTasks: string[];
  selectedSkills: string[];
  interests: string[];
  workEnvironmentPref: "remote" | "hybrid" | "office" | "flexible";
  locations: string[];
  includeRemote: boolean;
  desiredSalaryMin: number;
  desiredSalaryMax: number;
  salaryType: "yearly" | "hourly";
}

export interface ResumeData {
  fileName: string;
  storageUrl: string;
  uploadedAt: Timestamp;
  parsed: {
    skills: string[];
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      description: string;
    }>;
    education: string[];
    yearsExperience: number;
  };
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Timestamp;
  
  // Subscription
  subscriptionTier: "free" | "trial" | "basic" | "premium";
  subscriptionStatus: "active" | "canceled" | "expired";
  subscriptionStartDate?: Timestamp;
  subscriptionEndDate?: Timestamp;
  stripeCustomerId?: string;
  
  // Profile data
  currentRole: string;
  currentCompany?: string;
  
  resumeData?: ResumeData;
  
  // Quiz/Onboarding answers
  profile: UserProfile;
  
  // Matching data
  matchingTags: string[];
  careerPathsExplored: string[];
  
  // Job interactions
  likedJobs: string[];
  dislikedJobs: string[];
  hiddenJobs: string[];
  savedJobs: string[];
  appliedJobs: Array<{
    jobId: string;
    appliedAt: Timestamp;
    method: "quick" | "customized" | "external";
  }>;
  
  // Preferences
  emailNotifications: boolean;
  emailFrequency: "daily" | "weekly" | "never";
}

