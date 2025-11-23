interface SerpAPIJob {
  job_id: string;
  title: string;
  company_name: string;
  location: string;
  description: string;
  detected_extensions?: {
    posted_at?: string;
    schedule_type?: string;
    salary?: string;
  };
  related_links?: Array<{ link: string }>;
  share_url?: string;
}

interface SerpAPIResponse {
  jobs_results?: SerpAPIJob[];
  error?: string;
}

export async function fetchJobsFromSerpAPI(
  query: string,
  location: string = "United States"
): Promise<SerpAPIJob[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  
  if (!apiKey) {
    const errorMsg = "SERPAPI_API_KEY not set in environment variables";
    console.error("[SerpAPI]", errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_jobs");
    url.searchParams.set("q", query);
    url.searchParams.set("location", location);
    url.searchParams.set("api_key", apiKey);

    console.log("[SerpAPI] Fetching jobs for:", { query, location });
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error("[SerpAPI] HTTP error:", response.status, errorText);
      throw new Error(`SerpAPI HTTP error: ${response.status} ${errorText}`);
    }

    const data: SerpAPIResponse = await response.json();
    
    if (data.error) {
      console.error("[SerpAPI] API error:", data.error);
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    const jobs = data.jobs_results || [];
    console.log("[SerpAPI] Successfully fetched", jobs.length, "jobs");
    return jobs;
  } catch (error) {
    console.error("[SerpAPI] Error fetching jobs:", error);
    throw error;
  }
}

export function transformSerpAPIJobToJob(serpJob: SerpAPIJob): Omit<import("@/types/job").Job, "postedDate" | "scrapedAt"> & { postedDate: Date } {
  // Extract salary from description or detected_extensions
  let salaryMin: number | undefined;
  let salaryMax: number | undefined;
  
  const salaryMatch = serpJob.detected_extensions?.salary?.match(/\$?([\d,]+)\s*-\s*\$?([\d,]+)/);
  if (salaryMatch) {
    salaryMin = parseInt(salaryMatch[1].replace(/,/g, ""));
    salaryMax = parseInt(salaryMatch[2].replace(/,/g, ""));
  }

  // Extract tags from title and description
  const tags: string[] = [];
  const titleLower = serpJob.title.toLowerCase();
  const descLower = serpJob.description.toLowerCase();
  
  // Common skill keywords
  const skillKeywords = [
    "salesforce", "hubspot", "excel", "sql", "python", "javascript",
    "project management", "data analysis", "customer success",
    "crm", "saas", "b2b", "sales", "marketing"
  ];
  
  skillKeywords.forEach(keyword => {
    if (titleLower.includes(keyword) || descLower.includes(keyword)) {
      tags.push(keyword);
    }
  });

  // Determine if remote
  const isRemote = 
    titleLower.includes("remote") ||
    descLower.includes("remote") ||
    serpJob.location.toLowerCase().includes("remote");

  // Parse posted date
  const postedDate = serpJob.detected_extensions?.posted_at 
    ? new Date(serpJob.detected_extensions.posted_at)
    : new Date();

  // Clean location string - remove non-English characters and normalize
  let cleanLocation = serpJob.location;
  // Remove Vietnamese/foreign language prefixes like "Thành phố" (city), "Hoa Kỳ" (United States)
  cleanLocation = cleanLocation
    .replace(/Thành phố\s+/gi, "") // Remove "Thành phố" (City)
    .replace(/Hoa Kỳ/gi, "United States") // Replace "Hoa Kỳ" with "United States"
    .replace(/,\s*United States/gi, ", United States") // Normalize United States
    .trim();
  
  // If location contains state abbreviation, format it nicely
  // e.g., "New York, NY, United States" -> "New York, NY"
  const stateAbbrMatch = cleanLocation.match(/(.+?),\s*([A-Z]{2}),\s*United States/i);
  if (stateAbbrMatch) {
    cleanLocation = `${stateAbbrMatch[1]}, ${stateAbbrMatch[2]}`;
  } else if (cleanLocation.endsWith(", United States")) {
    // Remove trailing ", United States" if no state abbreviation
    cleanLocation = cleanLocation.replace(/,\s*United States$/i, "");
  }

  return {
    jobId: serpJob.job_id,
    title: serpJob.title,
    company: serpJob.company_name,
    location: cleanLocation,
    remote: isRemote,
    hybrid: false, // Would need more parsing to determine
    description: serpJob.description,
    requirements: [], // Would need to parse from description
    responsibilities: [], // Would need to parse from description
    salaryMin,
    salaryMax,
    salaryCurrency: "USD" as const,
    postedDate: postedDate,
    source: "google" as const,
    applyUrl: serpJob.related_links?.[0]?.link || serpJob.share_url || "",
    tags,
    jobType: "full-time" as const, // Default, would need parsing
    seniorityLevel: "mid" as const, // Default, would need parsing
    isActive: true,
  };
}

