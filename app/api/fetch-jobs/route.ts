import { NextRequest, NextResponse } from "next/server";
import { fetchJobsFromSerpAPI, transformSerpAPIJobToJob } from "@/lib/serpapi";
import { getDbInstance } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { getUserProfile } from "@/lib/firestore";
import { matchJobsForUser } from "@/lib/matching";
import { Job } from "@/types/job";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, location } = body;

    console.log("[fetch-jobs] Request received:", { userId: userId?.substring(0, 10) + "...", role, location });

    if (!userId) {
      console.log("[fetch-jobs] No userId provided");
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user profile
    let user;
    try {
      user = await getUserProfile(userId);
      console.log("[fetch-jobs] User profile retrieved:", user ? "exists" : "not found");
    } catch (profileError) {
      console.error("[fetch-jobs] Error getting user profile:", profileError);
      return NextResponse.json(
        { error: "Failed to retrieve user profile", details: profileError instanceof Error ? profileError.message : "Unknown error" },
        { status: 500 }
      );
    }

    if (!user) {
      console.log("[fetch-jobs] User not found, creating default profile");
      // Create a minimal user profile from sessionStorage data if available
      // This allows jobs to be fetched even if user isn't in Firestore yet
      user = {
        uid: userId,
        currentRole: role || "Software Engineer",
        profile: {
          selectedSkills: [],
          selectedTasks: [],
          interests: [],
          workEnvironmentPref: "flexible" as const,
          locations: location ? [location] : [],
          includeRemote: true,
          desiredSalaryMin: 50000,
          desiredSalaryMax: 150000,
          salaryType: "yearly" as const,
        },
        matchingTags: [],
      } as any;
    }

    // Determine search query
    const searchQuery = role || user.currentRole || "software engineer";
    let searchLocation = location || user.profile?.locations?.[0] || "United States";
    
    // Normalize location format for SerpAPI
    // SerpAPI expects formats like "New York, NY, United States" or just city/state names
    // Convert "New York, US" -> "New York" (SerpAPI will default to US)
    if (searchLocation.includes(", US")) {
      // Extract just the city/state name before ", US"
      searchLocation = searchLocation.replace(", US", "").trim();
      // If it's "City, State", keep it; otherwise just use the city
      const parts = searchLocation.split(",");
      if (parts.length > 1) {
        // Has state: "New York, New York" -> keep as is
        searchLocation = searchLocation;
      } else {
        // Just city: "New York" -> keep as is
        searchLocation = searchLocation;
      }
    } else if (searchLocation.includes("United States") || searchLocation.includes("USA")) {
      // Remove "United States" or "USA" suffix - SerpAPI defaults to US
      searchLocation = searchLocation.replace(/,?\s*(United States|USA)/i, "").trim();
    }
    
    // If location is empty or just "United States", use a default
    if (!searchLocation || searchLocation.toLowerCase() === "united states") {
      searchLocation = "United States";
    }
    
    console.log("[fetch-jobs] Normalized location:", searchLocation, "from original:", location || user.profile?.locations?.[0]);

    // Check if we have recent jobs in Firestore (within last 6 hours)
    let jobs: Job[] = [];
    let useCachedJobs = false;
    
    try {
      const db = getDbInstance();
      const jobsRef = collection(db, "jobs");
      const recentJobsQuery = query(
        jobsRef,
        where("isActive", "==", true),
        where("scrapedAt", ">", Timestamp.fromMillis(Date.now() - 6 * 60 * 60 * 1000))
      );

      const jobsSnapshot = await getDocs(recentJobsQuery);
      console.log("[fetch-jobs] Cached jobs found:", jobsSnapshot.size);

      if (!jobsSnapshot.empty) {
        // Use cached jobs
        jobs = jobsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            postedDate: data.postedDate,
            scrapedAt: data.scrapedAt,
            isActive: data.isActive !== false,
          } as Job;
        });
        console.log("[fetch-jobs] Using", jobs.length, "cached jobs");
        useCachedJobs = true;
      }
    } catch (dbError) {
      console.error("[fetch-jobs] Error querying Firestore (index may be missing):", dbError);
      // Firestore query failed (likely missing index), will fetch from SerpAPI
      useCachedJobs = false;
    }

    // If no cached jobs, fetch from SerpAPI
    if (!useCachedJobs || jobs.length === 0) {
      console.log("[fetch-jobs] Fetching jobs from SerpAPI for:", { query: searchQuery, location: searchLocation });
      try {
        const serpJobs = await fetchJobsFromSerpAPI(searchQuery, searchLocation);
        console.log("[fetch-jobs] SerpAPI returned", serpJobs.length, "jobs");
        
        if (serpJobs.length === 0) {
          console.log("[fetch-jobs] No jobs returned from SerpAPI - this may be normal if no jobs match the query");
          // Don't return early - continue to return empty matches so UI can show message
          jobs = [];
        } else {
        
        // Transform jobs
        const transformedJobs: Job[] = [];
        const db = getDbInstance();
        
        for (const serpJob of serpJobs.slice(0, 50)) { // Limit to 50 jobs
          try {
            const transformed = transformSerpAPIJobToJob(serpJob);
            const postedDate = transformed.postedDate instanceof Date 
              ? Timestamp.fromDate(transformed.postedDate)
              : Timestamp.now();
            
            const jobDoc = {
              ...transformed,
              scrapedAt: Timestamp.now(),
              postedDate: postedDate,
              isActive: true,
            } as Job;

            // Try to save to Firestore (but don't fail if it doesn't work)
            try {
              const jobRef = doc(db, "jobs", serpJob.job_id);
              await setDoc(jobRef, jobDoc, { merge: true });
            } catch (saveError) {
              console.warn("[fetch-jobs] Could not save job to Firestore:", saveError);
              // Continue anyway
            }
            
            transformedJobs.push(jobDoc);
          } catch (transformError) {
            console.error("[fetch-jobs] Error transforming job:", transformError);
            // Continue with next job
          }
        }

          jobs = transformedJobs;
          console.log("[fetch-jobs] Successfully transformed", jobs.length, "jobs");
        }
      } catch (error) {
        console.error("[fetch-jobs] Error fetching from SerpAPI:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[fetch-jobs] SerpAPI error details:", errorMessage);
        
        // Check if it's an API key issue
        if (errorMessage.includes("API key") || errorMessage.includes("SERPAPI") || errorMessage.includes("not set")) {
          console.error("[fetch-jobs] SerpAPI key may be missing or invalid. Check your .env file for SERPAPI_API_KEY");
          // Return a helpful message about API key
          return NextResponse.json({
            success: true,
            jobs: 0,
            matches: [],
            message: "Job search is not configured. Please set up SerpAPI API key.",
            error: process.env.NODE_ENV === "development" ? errorMessage : undefined,
          });
        }
        
        // For other errors, return empty matches
        jobs = [];
      }
    }

    // If still no jobs found, return empty matches
    if (jobs.length === 0) {
      console.log("[fetch-jobs] No jobs available after all attempts");
      return NextResponse.json({
        success: true,
        jobs: 0,
        matches: [],
        message: "No jobs found. Try adjusting your search criteria.",
      });
    }

    // Match jobs for user
    let matches;
    try {
      // Ensure user profile exists and has required fields
      if (!user.profile) {
        user.profile = {
          selectedSkills: [],
          selectedTasks: [],
          interests: [],
          workEnvironmentPref: "flexible",
          locations: [],
          includeRemote: true,
          desiredSalaryMin: 0,
          desiredSalaryMax: 200000,
          salaryType: "yearly",
        };
      }
      matches = matchJobsForUser(user, jobs);
    } catch (matchError) {
      console.error("Error matching jobs:", matchError);
      // If matching fails, return jobs without match scores
      matches = jobs.map(job => ({
        job,
        matchScore: 50, // Default score
        reasons: ["Potential match"],
      }));
    }
    
    // If no matches after filtering, return all jobs with default scores
    if (matches.length === 0 && jobs.length > 0) {
      matches = jobs.map(job => ({
        job,
        matchScore: 50,
        reasons: ["Potential match"],
      }));
    }

    // Return top matches (limit to 20 for performance)
    const topMatches = matches.slice(0, 20);

    return NextResponse.json({
      success: true,
      jobs: jobs.length,
      matches: topMatches.map(m => {
        const job = m.job;
        return {
          jobId: job.jobId || `job-${Math.random()}`,
          title: job.title || "Job Title",
          company: job.company || "Company",
          location: job.location || "Location not specified",
          remote: job.remote || false,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          applyUrl: job.applyUrl || "#",
          matchScore: m.matchScore || 0,
          reasons: m.reasons || [],
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === "development" 
      ? (error instanceof Error ? error.message : "Unknown error")
      : "Failed to fetch jobs";
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}

