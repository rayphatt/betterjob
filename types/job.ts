import { Timestamp } from "firebase/firestore";

export interface Job {
  jobId: string;
  
  // Basic info
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  remote: boolean;
  hybrid: boolean;
  
  // Details
  description: string;
  requirements: string[];
  responsibilities: string[];
  
  // Metadata
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: "USD";
  
  postedDate: Timestamp;
  expiresDate?: Timestamp;
  
  // Source
  source: "google" | "indeed" | "linkedin" | "manual";
  applyUrl: string;
  
  // For matching
  tags: string[];
  jobType: "full-time" | "part-time" | "contract" | "internship";
  seniorityLevel: "entry" | "mid" | "senior" | "lead" | "executive";
  
  // Aggregation
  scrapedAt: Timestamp;
  isActive: boolean;
}

