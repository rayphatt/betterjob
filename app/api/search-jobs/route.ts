import { NextRequest, NextResponse } from "next/server";
import { fetchJobsFromSerpAPI, transformSerpAPIJobToJob } from "@/lib/serpapi";
import { getDbInstance } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { Job } from "@/types/job";

/**
 * Simple job search endpoint for career paths
 * Returns jobs for a specific role without heavy user matching
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, location, limit = 10 } = body;

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }

    const searchQuery = role;
    let searchLocation = location || "United States";
    
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
    
    console.log("[search-jobs] Normalized location:", searchLocation, "from original:", location);

    let jobs: Job[] = [];
    const db = getDbInstance();

    // Try to check Firestore cache first, but fall back to SerpAPI if query fails
    try {
      const jobsRef = collection(db, "jobs");
      
      // Try to find cached jobs by searching title
      // Note: This is a simple approach - in production you might want better indexing
      const recentJobsQuery = query(
        jobsRef,
        where("isActive", "==", true),
        where("scrapedAt", ">", Timestamp.fromMillis(Date.now() - 6 * 60 * 60 * 1000))
      );

      const jobsSnapshot = await getDocs(recentJobsQuery);

      if (!jobsSnapshot.empty) {
        // Filter cached jobs by role title (case-insensitive partial match)
        const roleLower = role.toLowerCase();
        jobs = jobsSnapshot.docs
          .map(doc => ({
            ...doc.data(),
            postedDate: doc.data().postedDate,
            scrapedAt: doc.data().scrapedAt,
          })) as Job[];
        
        // Filter by role title
        jobs = jobs.filter(job => 
          job.title.toLowerCase().includes(roleLower) ||
          roleLower.includes(job.title.toLowerCase().split(' ')[0]) // Match first word
        );
      }
    } catch (firestoreError: any) {
      // If Firestore query fails (e.g., missing index), log and continue to SerpAPI
      console.warn("[search-jobs] Firestore query failed, falling back to SerpAPI:", firestoreError?.code || firestoreError?.message);
      // Continue to fetch from SerpAPI below
    }

    // If no cached jobs found, fetch from SerpAPI
    if (jobs.length === 0) {
      try {
        const serpJobs = await fetchJobsFromSerpAPI(searchQuery, searchLocation);
        
        // Transform and save to Firestore
        const transformedJobs: Job[] = [];
        for (const serpJob of serpJobs.slice(0, 50)) {
          const transformed = transformSerpAPIJobToJob(serpJob);
          const postedDate = transformed.postedDate instanceof Date 
            ? Timestamp.fromDate(transformed.postedDate)
            : Timestamp.now();
          
          // Prepare job document, converting undefined to null for Firestore compatibility
          const jobDoc: any = {
            ...transformed,
            scrapedAt: Timestamp.now(),
            postedDate: postedDate,
            salaryMin: transformed.salaryMin ?? null,
            salaryMax: transformed.salaryMax ?? null,
          };

          // Remove undefined fields (Firestore doesn't allow undefined)
          Object.keys(jobDoc).forEach(key => {
            if (jobDoc[key] === undefined) {
              delete jobDoc[key];
            }
          });

          // Try to save to Firestore, but don't fail if it errors
          try {
            const jobRef = doc(db, "jobs", serpJob.job_id);
            await setDoc(jobRef, jobDoc, { merge: true });
          } catch (saveError) {
            // Log but continue - we still want to return the jobs even if saving fails
            console.warn("[search-jobs] Failed to save job to Firestore:", saveError);
          }
          
          transformedJobs.push(jobDoc as Job);
        }

        jobs = transformedJobs;
      } catch (error) {
        console.error("Error fetching from SerpAPI:", error);
        return NextResponse.json({
          success: true,
          jobs: [],
          message: "Unable to fetch jobs at this time. Please try again later.",
        });
      }
    }

    // Limit results
    const limitedJobs = jobs.slice(0, limit);
    
    // Determine if results are from cache
    const fromCache = jobs.length > 0 && jobs[0]?.scrapedAt?.toMillis() 
      ? (Date.now() - jobs[0].scrapedAt.toMillis()) < (6 * 60 * 60 * 1000)
      : false;

    return NextResponse.json(
      {
        success: true,
        jobs: limitedJobs.map(job => ({
          jobId: job.jobId,
          title: job.title,
          company: job.company,
          companyLogo: job.companyLogo,
          location: job.location,
          remote: job.remote || false,
          hybrid: job.hybrid || false,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          applyUrl: job.applyUrl,
          description: job.description,
          postedDate: job.postedDate?.toMillis(),
          jobType: job.jobType,
          seniorityLevel: job.seniorityLevel,
        })),
        total: jobs.length,
        cached: fromCache,
      },
      {
        headers: {
          'Cache-Control': fromCache 
            ? 'public, max-age=21600, stale-while-revalidate=3600' // 6 hours if cached
            : 'public, max-age=3600, stale-while-revalidate=1800', // 1 hour if fresh
        },
      }
    );
  } catch (error) {
    console.error("Error searching jobs:", error);
    return NextResponse.json(
      { error: "Failed to search jobs" },
      { status: 500 }
    );
  }
}

