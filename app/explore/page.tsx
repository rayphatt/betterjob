"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { ChevronDown, ChevronUp, ExternalLink, MapPin, Briefcase, ThumbsUp, ThumbsDown, X } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { BackButton } from "@/components/back-button";

interface SweetSpot {
  skill: string;
  explanation: string;
}

interface CareerPath {
  id?: string;
  role: string;
  matchScore: number;
  category: "related" | "stretch" | "unexpected";
  reasoning?: string;
  overview?: string;
  averageSalary?: string;
  typicalDegree?: string;
  sweetSpots?: SweetSpot[];
  salaryRange: string;
  difficulty?: "easy" | "moderate" | "challenging";
  icon?: string;
  timeToTransition?: string;
  companies?: string[];
}

interface JobListing {
  jobId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  applyUrl: string;
  matchScore?: number;
  reasons?: string[];
}

export default function ExplorePage() {
  const { data } = useOnboarding();
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [pathJobs, setPathJobs] = useState<Record<string, { jobs: JobListing[]; isLoading: boolean; error?: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [careerPreferences, setCareerPreferences] = useState<Record<string, "like" | "dislike" | null>>({});
  const [notification, setNotification] = useState<{ message: string; visible: boolean; pathId?: string }>({ message: "", visible: false });
  const [selectedSweetSpot, setSelectedSweetSpot] = useState<Record<string, number>>({});
  const [notificationTimeout, setNotificationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedCareerForJobs, setSelectedCareerForJobs] = useState<string | null>(null);
  const [sidebarJobs, setSidebarJobs] = useState<{ jobs: JobListing[]; isLoading: boolean; error?: string }>({ jobs: [], isLoading: false });
  const [recommendedJobs, setRecommendedJobs] = useState<JobListing[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  useEffect(() => {
    const fetchCareerPaths = async () => {
      const resumeUploaded = sessionStorage.getItem("resume_uploaded") === "true";
      
      let role = data.role;
      let skills = data.skills || [];
      let tasks = data.tasks || [];
      
      if (resumeUploaded) {
        const savedSelectedRoles = sessionStorage.getItem("onboarding_selected_roles");
        if (savedSelectedRoles) {
          try {
            const rolesInfo = JSON.parse(savedSelectedRoles);
            if (rolesInfo && rolesInfo.length > 0 && !role) {
              role = rolesInfo[0].title || "";
            }
          } catch (e) {
            console.error("Error parsing selected roles:", e);
          }
        }
        
        const resumeTasks = sessionStorage.getItem("onboarding_tasks");
        const resumeSkills = sessionStorage.getItem("onboarding_skills");
        
        if (resumeTasks) {
          try {
            tasks = JSON.parse(resumeTasks);
          } catch (e) {
            console.error("Error parsing resume tasks:", e);
          }
        }
        
        if (resumeSkills) {
          try {
            skills = JSON.parse(resumeSkills);
          } catch (e) {
            console.error("Error parsing resume skills:", e);
          }
        }
      } else {
        const manualRole = sessionStorage.getItem("onboarding_role");
        const manualTasks = sessionStorage.getItem("onboarding_tasks");
        const manualSkills = sessionStorage.getItem("onboarding_skills");
        
        if (manualRole) role = manualRole;
        if (manualTasks) {
          try {
            tasks = JSON.parse(manualTasks);
          } catch (e) {
            console.error("Error parsing manual tasks:", e);
          }
        }
        if (manualSkills) {
          try {
            skills = JSON.parse(manualSkills);
          } catch (e) {
            console.error("Error parsing manual skills:", e);
          }
        }
      }
      
      if (!role) {
        setError("No role data found. Please complete onboarding first.");
        setIsLoading(false);
        return;
      }

      // Generate cache key for localStorage
      const cacheKey = `career_paths_${btoa(JSON.stringify({
        role: role.toLowerCase().trim(),
        skills: (skills || []).sort().map(s => s.toLowerCase().trim()),
        tasks: (tasks || []).sort().map(t => t.toLowerCase().trim()),
        interests: (data.interests || []).sort().map(i => i.toLowerCase().trim()),
      }))}`;

      // Check localStorage cache first
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const cacheAge = Date.now() - (parsed.timestamp || 0);
          const cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
          
          if (cacheAge < cacheExpiry && parsed.careerPaths && parsed.careerPaths.length > 0) {
            console.log(`[Explore] Using ${parsed.careerPaths.length} cached paths from localStorage`);
            const pathsWithIds = parsed.careerPaths.map((path: CareerPath, index: number) => ({
              ...path,
              id: `path-${index}`,
              icon: path.icon || "💼",
            }));
            setCareerPaths(pathsWithIds);
            setIsLoading(false);
            return;
          } else {
            // Expired cache, remove it
            localStorage.removeItem(cacheKey);
          }
        } catch (e) {
          console.error("Error parsing cached data:", e);
          localStorage.removeItem(cacheKey);
        }
      }

      try {
        setIsLoading(true);
        const response = await fetch("/api/generate-paths", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentRole: role,
            skills: skills,
            tasks: tasks,
            interests: data.interests || [],
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate career paths");
        }

        const result = await response.json();
        
        if (result.careerPaths && result.careerPaths.length > 0) {
          console.log(`[Explore] Received ${result.careerPaths.length} career paths from API${result.cached ? ' (cached)' : ''}`);
          
          // Cache in localStorage
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              careerPaths: result.careerPaths,
              timestamp: Date.now(),
            }));
          } catch (e) {
            console.warn("Failed to cache in localStorage:", e);
          }
          
          const pathsWithIds = result.careerPaths.map((path: CareerPath, index: number) => ({
            ...path,
            id: `path-${index}`,
            icon: path.icon || "💼",
          }));
          setCareerPaths(pathsWithIds);
          console.log(`[Explore] Set ${pathsWithIds.length} career paths in state`);
        } else {
          setError("No career paths found. Please try again.");
        }
      } catch (err) {
        console.error("Error fetching career paths:", err);
        setError("Failed to load career paths. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCareerPaths();
    
    // Load career preferences from sessionStorage
    const savedPreferences = sessionStorage.getItem("career_preferences");
    if (savedPreferences) {
      try {
        setCareerPreferences(JSON.parse(savedPreferences));
      } catch (e) {
        console.error("Error loading career preferences:", e);
      }
    }
  }, [data.role, data.skills, data.tasks, data.interests]);

  // Fetch recommended jobs for the right side based on career paths
  useEffect(() => {
    const fetchRecommendedJobs = async () => {
      try {
        setIsLoadingJobs(true);
        const user = getCurrentUser();
        
        if (!user) {
          // Try to sign in anonymously if not authenticated
          try {
            const { signInAnonymouslyUser } = await import("@/lib/auth");
            const anonymousUser = await signInAnonymouslyUser();
            if (!anonymousUser) {
              setIsLoadingJobs(false);
              return;
            }
          } catch (e) {
            console.error("Error signing in anonymously:", e);
            setIsLoadingJobs(false);
            return;
          }
        }

        const currentUser = getCurrentUser();
        if (!currentUser) {
          setIsLoadingJobs(false);
          return;
        }

        // Wait for career paths to be loaded
        if (careerPaths.length === 0) {
          setIsLoadingJobs(false);
          return;
        }

        const preferences = data.preferences || (sessionStorage.getItem("onboarding_preferences") ? JSON.parse(sessionStorage.getItem("onboarding_preferences")!) : null);
        const location = preferences?.location || "United States";

        // Get roles from career paths (prioritize liked paths, then all paths)
        const likedPaths = careerPaths.filter(path => careerPreferences[path.id || ""] === "like");
        const pathsToUse = likedPaths.length > 0 ? likedPaths : careerPaths.slice(0, 5); // Use top 5 if no likes
        
        // Construct search queries that combine role + industry/interest to match the dream board
        // This ensures we search for jobs that combine the user's background with their interests
        const searchQueries = pathsToUse.map(path => {
          // Extract role and industry from career path
          // Example: "Financial Analyst (Fitness Industry)" -> "Financial Analyst Fitness"
          // This format is more likely to find actual jobs that combine finance with fitness
          const roleMatch = path.role.match(/^(.+?)\s*\((.+?)\)$/);
          if (roleMatch) {
            const baseRole = roleMatch[1].trim();
            const industry = roleMatch[2].trim().replace(/\s+(Industry|Technology|Startups?|Apps?)$/i, '').trim();
            // Combine: "Financial Analyst Fitness" or "Product Manager Music"
            return `${baseRole} ${industry}`;
          }
          // If no parentheses, use the role as-is
          return path.role;
        });

        console.log("[Explore] Fetching jobs for career paths:", searchQueries);

        // Fetch jobs for each career path and combine them
        const allJobsPromises = searchQueries.map(async (searchQuery) => {
          try {
            const response = await fetch("/api/search-jobs", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                role: searchQuery, // Use full career path role including industry
                location: location,
                limit: 5, // Get 5 jobs per career path
              }),
            });

            if (!response.ok) {
              console.warn(`[Explore] Failed to fetch jobs for ${searchQuery}`);
              return [];
            }

            const result = await response.json();
            return result.jobs || [];
          } catch (error) {
            console.error(`[Explore] Error fetching jobs for ${searchQuery}:`, error);
            return [];
          }
        });

        const allJobsArrays = await Promise.all(allJobsPromises);
        const allJobs = allJobsArrays.flat();

        // Remove duplicates based on jobId
        const uniqueJobs = Array.from(
          new Map(allJobs.map(job => [job.jobId || job.title + job.company, job])).values()
        );

        // Limit to top 10 jobs
        const limitedJobs = uniqueJobs.slice(0, 10).map((job: any) => ({
          jobId: job.jobId || `job-${Math.random()}`,
          title: job.title || "Job Title",
          company: job.company || "Company",
          location: job.location || "Location not specified",
          remote: job.remote || false,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          applyUrl: job.applyUrl || job.link || "#",
          matchScore: 75, // Default score for career path jobs
          reasons: [],
        }));

        console.log("[Explore] Setting", limitedJobs.length, "jobs from career paths");
        setRecommendedJobs(limitedJobs);
      } catch (err) {
        console.error("Error fetching recommended jobs:", err);
        // Set empty jobs on error so user knows something went wrong
        setRecommendedJobs([]);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    // Fetch jobs when career paths are loaded
    if (careerPaths.length > 0) {
      fetchRecommendedJobs();
    }
  }, [careerPaths, careerPreferences, data.preferences]);

  const fetchMoreCareerPaths = async () => {
    const resumeUploaded = sessionStorage.getItem("resume_uploaded") === "true";
    
    let role = data.role;
    let skills = data.skills || [];
    let tasks = data.tasks || [];
    
    if (resumeUploaded) {
      const savedSelectedRoles = sessionStorage.getItem("onboarding_selected_roles");
      if (savedSelectedRoles) {
        try {
          const rolesInfo = JSON.parse(savedSelectedRoles);
          if (rolesInfo && rolesInfo.length > 0 && !role) {
            role = rolesInfo[0].title || "";
          }
        } catch (e) {
          console.error("Error parsing selected roles:", e);
        }
      }
      
      const resumeTasks = sessionStorage.getItem("onboarding_tasks");
      const resumeSkills = sessionStorage.getItem("onboarding_skills");
      
      if (resumeTasks) {
        try {
          tasks = JSON.parse(resumeTasks);
        } catch (e) {
          console.error("Error parsing resume tasks:", e);
        }
      }
      
      if (resumeSkills) {
        try {
          skills = JSON.parse(resumeSkills);
        } catch (e) {
          console.error("Error parsing resume skills:", e);
        }
      }
    } else {
      const manualRole = sessionStorage.getItem("onboarding_role");
      const manualTasks = sessionStorage.getItem("onboarding_tasks");
      const manualSkills = sessionStorage.getItem("onboarding_skills");
      
      if (manualRole) role = manualRole;
      if (manualTasks) {
        try {
          tasks = JSON.parse(manualTasks);
        } catch (e) {
          console.error("Error parsing manual tasks:", e);
        }
      }
      if (manualSkills) {
        try {
          skills = JSON.parse(manualSkills);
        } catch (e) {
          console.error("Error parsing manual skills:", e);
        }
      }
    }
    
    if (!role) {
      setError("No role data found. Please complete onboarding first.");
      return;
    }

    try {
      setIsLoadingMore(true);
      const response = await fetch("/api/generate-paths", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentRole: role,
          skills: skills,
          tasks: tasks,
          interests: data.interests || [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate additional career paths");
      }

      const result = await response.json();
      
      if (result.careerPaths && result.careerPaths.length > 0) {
        const pathsWithIds = result.careerPaths.map((path: CareerPath, index: number) => ({
          ...path,
          id: `path-${Date.now()}-${index}`, // Use timestamp to ensure unique IDs
          icon: path.icon || "💼",
        }));
        
        // Get existing role names to avoid duplicates
        const existingRoles = new Set(careerPaths.map(p => p.role.toLowerCase()));
        
        // Filter out duplicates and add new paths
        const newPaths = pathsWithIds.filter((path: CareerPath) => 
          !existingRoles.has(path.role.toLowerCase())
        );
        
        if (newPaths.length > 0) {
          setCareerPaths(prev => [...prev, ...newPaths]);
          console.log(`[Explore] Added ${newPaths.length} new career paths`);
        } else {
          console.log(`[Explore] No new unique paths to add`);
        }
      }
    } catch (err) {
      console.error("Error fetching additional career paths:", err);
      setError("Failed to load additional career paths. Please try again later.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
    };
  }, [notificationTimeout]);

  const handleCareerPreference = (pathId: string, preference: "like" | "dislike") => {
    const isDisliking = preference === "dislike" && careerPreferences[pathId] !== "dislike";
    const isTogglingOff = careerPreferences[pathId] === preference;
    
    const newPreferences = {
      ...careerPreferences,
      [pathId]: isTogglingOff ? null : preference, // Toggle if same preference clicked
    };
    setCareerPreferences(newPreferences);
    sessionStorage.setItem("career_preferences", JSON.stringify(newPreferences));
    
    // If disliking, show notification and collapse if expanded
    if (isDisliking) {
      const dislikedPath = careerPaths.find(p => p.id === pathId);
      
      // Clear any existing timeout
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
      
      setNotification({
        message: `"${dislikedPath?.role || 'Career path'}" removed from your dream board`,
        visible: true,
        pathId: pathId,
      });
      
      // Collapse if this path is currently expanded
      if (expandedPath === pathId) {
        setExpandedPath(null);
      }
      
      // Hide notification after 5 seconds (longer to allow undo)
      const timeout = setTimeout(() => {
        setNotification({ message: "", visible: false });
      }, 5000);
      setNotificationTimeout(timeout);
    }
    
    // TODO: Send preference to backend for better job matching
    // This could be done via an API call to save user preferences
  };

  const handleUndoDislike = (pathId: string) => {
    // Clear the timeout
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      setNotificationTimeout(null);
    }
    
    // Remove the dislike preference
    const newPreferences = {
      ...careerPreferences,
      [pathId]: null,
    };
    setCareerPreferences(newPreferences);
    sessionStorage.setItem("career_preferences", JSON.stringify(newPreferences));
    
    // Hide notification
    setNotification({ message: "", visible: false });
  };

  const fetchJobsForPath = async (path: CareerPath) => {
    const pathId = path.id || "";
    
    // Don't fetch if already loading or loaded
    if (pathJobs[pathId]?.isLoading || pathJobs[pathId]?.jobs) {
      return;
    }

    setPathJobs(prev => ({
      ...prev,
      [pathId]: { jobs: [], isLoading: true }
    }));

    try {
      // Extract base role title (remove industry context in parentheses)
      // Example: "Product Manager (Music Technology)" -> "Product Manager"
      const roleTitle = path.role.split("(")[0].trim();
      // Get location from preferences or default to "United States"
      const preferences = data.preferences || (sessionStorage.getItem("onboarding_preferences") ? JSON.parse(sessionStorage.getItem("onboarding_preferences")!) : null);
      const location = preferences?.location || "United States";

      // Use the simpler search-jobs endpoint that doesn't require user matching
      const response = await fetch("/api/search-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: roleTitle,
          location: location,
          limit: 10,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch jobs");
      }

      const result = await response.json();
      
      if (result.jobs && result.jobs.length > 0) {
        const jobs: JobListing[] = result.jobs.map((job: any) => ({
          jobId: job.jobId,
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote || false,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          applyUrl: job.applyUrl,
        }));

        setPathJobs(prev => ({
          ...prev,
          [pathId]: { jobs, isLoading: false }
        }));
      } else {
        setPathJobs(prev => ({
          ...prev,
          [pathId]: { jobs: [], isLoading: false, error: "No jobs found for this role. Try a different location or check back later." }
        }));
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load jobs";
      setPathJobs(prev => ({
        ...prev,
        [pathId]: { jobs: [], isLoading: false, error: errorMessage }
      }));
    }
  };

  const handlePathClick = (path: CareerPath) => {
    const pathId = path.id || "";
    if (expandedPath === pathId) {
      setExpandedPath(null);
      setSelectedCareerForJobs(null);
      setSidebarJobs({ jobs: [], isLoading: false });
    } else {
      setExpandedPath(pathId);
      setSelectedCareerForJobs(pathId);
      fetchJobsForSidebar(path);
      // Auto-select first sweet spot
      if (path.sweetSpots && path.sweetSpots.length > 0) {
        setSelectedSweetSpot(prev => ({ ...prev, [pathId]: 0 }));
      }
    }
  };

  const fetchJobsForSidebar = async (path: CareerPath) => {
    setSidebarJobs({ jobs: [], isLoading: true });
    
    try {
      // Extract base role title (remove industry context in parentheses)
      const roleTitle = path.role.split("(")[0].trim();
      // Get location from preferences or default to "United States"
      const preferences = data.preferences || (sessionStorage.getItem("onboarding_preferences") ? JSON.parse(sessionStorage.getItem("onboarding_preferences")!) : null);
      const location = preferences?.location || "United States";

      const response = await fetch("/api/search-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: roleTitle,
          location: location,
          limit: 20, // More jobs for sidebar
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch jobs");
      }

      const result = await response.json();
      
      if (result.jobs && result.jobs.length > 0) {
        const jobs: JobListing[] = result.jobs.map((job: any) => ({
          jobId: job.jobId,
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote || false,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          applyUrl: job.applyUrl,
        }));

        setSidebarJobs({ jobs, isLoading: false });
      } else {
        setSidebarJobs({ jobs: [], isLoading: false, error: "No jobs found for this role. Try a different location or check back later." });
      }
    } catch (err) {
      console.error("Error fetching jobs for sidebar:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load jobs";
      setSidebarJobs({ jobs: [], isLoading: false, error: errorMessage });
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not specified";
    if (min && max) return `$${(min / 1000).toFixed(0)}K - $${(max / 1000).toFixed(0)}K`;
    if (min) return `$${(min / 1000).toFixed(0)}K+`;
    return "";
  };

  const getMatchColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-700 border-green-300";
    if (score >= 80) return "bg-blue-100 text-blue-700 border-blue-300";
    return "bg-purple-100 text-purple-700 border-purple-300";
  };

  const getCategoryColor = (category: string) => {
    if (category === "related") return "bg-blue-50/50 border-blue-100";
    if (category === "stretch") return "bg-amber-50/50 border-amber-100";
    return "bg-purple-50/50 border-purple-100";
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-semibold">Discovering your career paths...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background-page via-background-page to-primary/5 pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between relative">
            <div className="flex-shrink-0">
              <BackButton />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold text-primary">
              BetterJob
            </div>
            <div className="flex-shrink-0">
              <Button
                onClick={fetchMoreCareerPaths}
                disabled={isLoadingMore || isLoading}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                {isLoadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    Loading...
                  </>
                ) : (
                  "Find More"
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12 lg:py-16">
        {/* Notification Message */}
        {notification.visible && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.3s_ease-out]">
            <div className="bg-white border-2 border-red-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 max-w-md">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <ThumbsDown className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-sm text-text-primary font-medium flex-1">{notification.message}</p>
              {notification.pathId && (
                <button
                  onClick={() => handleUndoDislike(notification.pathId!)}
                  className="text-sm font-semibold text-primary hover:text-primary/80 underline flex-shrink-0"
                >
                  Undo
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Content with Two Sides */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Side - Career Cards */}
          <div className="lg:flex-1">
            {/* Page Header */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary mb-2 sm:mb-3 leading-tight">
                Your Career Dream Board
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-text-secondary leading-relaxed">
                Explore paths that combine your experience as <span className="font-semibold text-text-primary">{data.role || "[Role]"}</span> with your genuine interests
              </p>
              {error && (
                <p className="text-sm text-warning mt-4">{error}</p>
              )}
            </div>
            {/* Dream Board Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {(() => {
                let visiblePaths = careerPaths.filter(path => careerPreferences[path.id || ""] !== "dislike");
                
                console.log(`[Explore] Total paths: ${careerPaths.length}, Visible paths: ${visiblePaths.length}, Disliked: ${careerPaths.length - visiblePaths.length}`);
                const expandedIndex = visiblePaths.findIndex(path => path.id === expandedPath);
            
            return visiblePaths.map((path, index) => {
            const isExpanded = expandedPath === path.id;
            const jobsData = pathJobs[path.id || ""];
            
            // Only hide cards in the same row if something is actually expanded
            if (expandedIndex >= 0 && !isExpanded && index !== expandedIndex) {
              // Calculate row numbers for different breakpoints
              // sm: 2 cols, lg: 3 cols, xl: 4 cols
              const rowSm = Math.floor(index / 2);
              const rowLg = Math.floor(index / 3);
              const rowXl = Math.floor(index / 4);
              const expandedRowSm = Math.floor(expandedIndex / 2);
              const expandedRowLg = Math.floor(expandedIndex / 3);
              const expandedRowXl = Math.floor(expandedIndex / 4);
              
              // Hide cards in the same row as expanded card (check all breakpoints)
              const isInSameRow = (
                (rowSm === expandedRowSm) || // Same row on sm
                (rowLg === expandedRowLg) || // Same row on lg
                (rowXl === expandedRowXl)     // Same row on xl
              );
              
              // Skip rendering if in same row as expanded card
              if (isInSameRow) {
                return null;
              }
            }
            
            // If this card is expanded, render it full-width spanning all columns
            if (isExpanded) {
              return (
                <div key={path.id} className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4">
                  <Card
                    className={`group relative transition-all duration-300 cursor-pointer border-2 overflow-hidden shadow-2xl border-primary shadow-primary/10 ${getCategoryColor(path.category)}`}
                    onClick={() => handlePathClick(path)}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                      {/* Left Column - Icon, Title, Reasoning */}
                      <div className="lg:col-span-1 flex flex-col h-full">
                        <CardHeader className="pb-3 lg:pb-4 flex-shrink-0">
                          <div className="flex items-start justify-between mb-2 lg:mb-3">
                            <div className="text-3xl sm:text-4xl lg:text-5xl transition-transform duration-300 group-hover:scale-110">
                              {path.icon}
                            </div>
                          </div>
                          <CardTitle className="text-lg sm:text-xl lg:text-2xl leading-tight mb-2 lg:mb-3 font-bold text-text-primary">
                            {path.role}
                          </CardTitle>
                          {path.reasoning && (
                            <p className="text-xs sm:text-sm lg:text-base text-text-secondary leading-relaxed">
                              {path.reasoning}
                            </p>
                          )}
                        </CardHeader>
                        
                        <CardContent className="flex flex-col flex-grow justify-end mt-auto">
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 mb-2">
                            <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                              Click to collapse
                            </span>
                            <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-text-secondary group-hover:text-primary transition-colors" />
                          </div>
                          
                          {/* Like/Dislike Buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-200/60">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`flex-1 h-8 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 ${
                                careerPreferences[path.id || ""] === "like"
                                  ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                                  : ""
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCareerPreference(path.id || "", "like");
                              }}
                            >
                              <ThumbsUp className={`w-3 h-3 mr-1 ${careerPreferences[path.id || ""] === "like" ? "fill-current" : ""}`} />
                              Like
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`flex-1 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ${
                                careerPreferences[path.id || ""] === "dislike"
                                  ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                                  : ""
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCareerPreference(path.id || "", "dislike");
                              }}
                            >
                              <ThumbsDown className={`w-3 h-3 mr-1 ${careerPreferences[path.id || ""] === "dislike" ? "fill-current" : ""}`} />
                              Dislike
                            </Button>
                          </div>
                        </CardContent>
                      </div>

                      {/* Right Column - Expanded Content */}
                      <div className="lg:col-span-2">
                        <CardContent className="pt-4 lg:pt-5 space-y-3">
                          {/* Overview */}
                          {path.overview && (
                            <div>
                              <h3 className="text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">Overview</h3>
                              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                                {path.overview}
                              </p>
                            </div>
                          )}

                          {/* Average Salary */}
                          {path.averageSalary && (
                            <div>
                              <h3 className="text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">Average Salary</h3>
                              <p className="text-base sm:text-lg font-bold text-primary">
                                {path.averageSalary}
                              </p>
                            </div>
                          )}

                          {/* Typical Degree Required */}
                          {path.typicalDegree && (
                            <div>
                              <h3 className="text-xs font-bold text-text-primary mb-1.5 uppercase tracking-wide">Typical Degree Required</h3>
                              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                                {path.typicalDegree}
                              </p>
                            </div>
                          )}

                          {/* Transferable Skills */}
                          {path.sweetSpots && path.sweetSpots.length > 0 && (
                            <div className="pt-3 border-t border-gray-200/60">
                              <div className="mb-2">
                                <h3 className="text-xs sm:text-sm font-bold text-text-primary mb-1">Transferable Skills</h3>
                                <p className="text-[10px] sm:text-xs text-text-secondary">
                                  Consider how the role of <span className="font-semibold text-text-primary">{path.role}</span> may overlap with where you are now.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {path.sweetSpots.map((spot, index) => (
                                  <button
                                    key={index}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSweetSpot(prev => ({
                                        ...prev,
                                        [path.id || ""]: prev[path.id || ""] === index ? -1 : index
                                      }));
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                      selectedSweetSpot[path.id || ""] === index
                                        ? "bg-green-100 text-green-700 border-2 border-green-300"
                                        : "bg-gray-100 text-text-secondary border-2 border-gray-200 hover:border-gray-300"
                                    }`}
                                  >
                                    {spot.skill}
                                  </button>
                                ))}
                              </div>
                              {selectedSweetSpot[path.id || ""] !== undefined && selectedSweetSpot[path.id || ""] >= 0 && (
                                <div className="p-2.5 bg-green-50 border-2 border-green-200 rounded-lg">
                                  <p className="text-[10px] sm:text-xs text-text-primary leading-relaxed">
                                    {path.sweetSpots[selectedSweetSpot[path.id || ""]].explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                        </CardContent>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            }
            
            // Render normal collapsed card
            return (
              <Card
                key={path.id}
                className={`group relative transition-all duration-300 cursor-pointer border-2 overflow-hidden hover:shadow-xl hover:scale-[1.01] border-gray-200 hover:border-primary/30 flex flex-col h-full ${getCategoryColor(path.category)}`}
                onClick={() => handlePathClick(path)}
              >
                <CardHeader className="pb-2 flex-shrink-0">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="text-2xl sm:text-3xl transition-transform duration-300 group-hover:scale-110">
                      {path.icon}
                    </div>
                  </div>
                  <CardTitle className="text-base sm:text-lg leading-tight mb-1.5 font-bold text-text-primary line-clamp-2">
                    {path.role}
                  </CardTitle>
                  {path.reasoning && (
                    <p className="text-xs text-text-secondary line-clamp-2 leading-snug">
                      {path.reasoning}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent className="flex flex-col flex-grow justify-end mt-auto p-4">
                  {/* Expand/Collapse Indicator */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/60 mb-1.5">
                    <span className="text-[10px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                      Click to learn more
                    </span>
                    <ChevronDown className="w-3 h-3 text-text-secondary group-hover:text-primary transition-colors" />
                  </div>
                  
                  {/* Like/Dislike Buttons */}
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-200/60">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex-1 h-7 text-[10px] text-green-600 hover:text-green-700 hover:bg-green-50 px-1 ${
                        careerPreferences[path.id || ""] === "like"
                          ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                          : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCareerPreference(path.id || "", "like");
                      }}
                    >
                      <ThumbsUp className={`w-2.5 h-2.5 mr-0.5 ${careerPreferences[path.id || ""] === "like" ? "fill-current" : ""}`} />
                      Like
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex-1 h-7 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 px-1 ${
                        careerPreferences[path.id || ""] === "dislike"
                          ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-300"
                          : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCareerPreference(path.id || "", "dislike");
                      }}
                    >
                      <ThumbsDown className={`w-2.5 h-2.5 mr-0.5 ${careerPreferences[path.id || ""] === "dislike" ? "fill-current" : ""}`} />
                      Dislike
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          });
          })()}
        </div>

            {careerPaths.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-lg text-text-secondary">No career paths found. Please complete your onboarding.</p>
              </div>
            )}
          </div>

          {/* Right Side - Jobs for You Sidebar */}
          <aside className="lg:w-96 lg:flex-shrink-0 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:pl-8 relative flex flex-col">
            {/* Full-height border line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"></div>
            
            {/* Header */}
            <div className="mb-6 relative z-10 flex-shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Jobs for you</h2>
              <p className="text-sm text-text-secondary mt-1">Based on your career interests</p>
            </div>

            {/* Jobs List - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 relative z-10 min-h-0">
              {isLoadingJobs ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                  <p className="text-sm text-text-secondary">Finding jobs for you...</p>
                </div>
              ) : recommendedJobs.length > 0 ? (
                <div className="space-y-4">
                  {recommendedJobs.map((job) => (
                    <div
                      key={job.jobId}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary/50 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-base text-text-primary line-clamp-2 flex-1 pr-2">
                          {job.title}
                        </h3>
                      </div>
                      <div className="flex flex-col gap-1.5 mb-3">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Briefcase className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{job.company}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {job.remote ? "🌍 Remote" : job.location}
                          </span>
                        </div>
                      </div>
                      {job.salaryMin || job.salaryMax ? (
                        <p className="text-sm font-bold text-primary mb-3">
                          {formatSalary(job.salaryMin, job.salaryMax)}
                        </p>
                      ) : null}
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 hover:gap-3 transition-all group/link"
                      >
                        View job <ExternalLink className="w-4 h-4 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-text-secondary">No jobs found. Complete your profile to see matches.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
