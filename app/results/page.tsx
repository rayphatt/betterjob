"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

interface JobMatch {
  job: {
    jobId: string;
    title: string;
    company: string;
    location: string;
    remote: boolean;
    salaryMin?: number;
    salaryMax?: number;
    description: string;
    applyUrl: string;
    postedDate?: number;
  };
  matchScore: number;
  reasons: string[];
}

export default function ResultsPage() {
  const router = useRouter();
  const { data } = useOnboarding();
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobMatch | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        const user = getCurrentUser();
        
        if (!user) {
          setError("Please complete onboarding first");
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/fetch-jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.uid,
            role: data.role,
            location: data.preferences?.location,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch jobs");
        }

        const result = await response.json();
        
        if (result.matches && result.matches.length > 0) {
          setJobs(result.matches.slice(0, 3)); // Show only 3 free jobs
        } else {
          setError(result.message || "No jobs found. Try adjusting your preferences.");
        }
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Unable to load jobs. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [data.role, data.preferences?.location]);

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not specified";
    if (min && max) return `$${(min / 1000).toFixed(0)}K - $${(max / 1000).toFixed(0)}K`;
    if (min) return `$${(min / 1000).toFixed(0)}K+`;
    return "";
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Recently";
    const daysAgo = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return "Today";
    if (daysAgo === 1) return "1 day ago";
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
    return `${Math.floor(daysAgo / 30)} months ago`;
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-700";
    if (score >= 60) return "bg-blue-100 text-blue-700";
    return "bg-purple-100 text-purple-700";
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background-page flex items-center justify-center px-4 sm:px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-semibold">Finding your perfect job matches...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background-page pb-24 sm:pb-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-3 sm:mb-4">
            We've already found some great job matches for you!
          </h1>
          <p className="text-base sm:text-lg text-text-secondary">
            Here are your first three job matches out of {jobs.length > 0 ? "600+" : "many"}.
          </p>
          {error && (
            <p className="text-sm text-warning mt-4">{error}</p>
          )}
        </div>

        {/* Job Cards */}
        {jobs.length > 0 && (
          <div className="space-y-4 sm:space-y-6 mb-12">
            {jobs.map((jobMatch) => (
              <Card
                key={jobMatch.job.jobId}
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedJob(jobMatch)}
              >
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-light rounded-lg flex items-center justify-center text-xl sm:text-2xl font-bold text-primary flex-shrink-0">
                          {jobMatch.job.company.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg sm:text-xl mb-1 line-clamp-2">
                            {jobMatch.job.title}
                          </CardTitle>
                          <p className="text-sm sm:text-base text-text-secondary font-medium">
                            {jobMatch.job.company}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                        <span className="text-xs sm:text-sm text-text-secondary">
                          📍 {jobMatch.job.location}
                        </span>
                        {jobMatch.job.remote && (
                          <Badge variant="outline" className="text-xs">
                            Remote
                          </Badge>
                        )}
                        <span className="text-xs sm:text-sm text-text-secondary">
                          📅 {formatDate(jobMatch.job.postedDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2">
                      <Badge className={getMatchColor(jobMatch.matchScore)}>
                        {jobMatch.matchScore}% Match
                      </Badge>
                      <p className="text-sm sm:text-base font-semibold text-text-primary">
                        {formatSalary(jobMatch.job.salaryMin, jobMatch.job.salaryMax)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {jobMatch.reasons.slice(0, 3).map((reason, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary line-clamp-2 mb-4">
                    {jobMatch.job.description.substring(0, 150)}...
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none min-h-[44px] touch-manipulation"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(jobMatch);
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      className="flex-1 sm:flex-none min-h-[44px] touch-manipulation"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(jobMatch.job.applyUrl, "_blank");
                      }}
                    >
                      Apply Now →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CTA Section */}
        <div className="bg-primary text-white rounded-lg p-6 sm:p-8 text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
            Cast a wider net while saving time
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 text-left">
            <div>
              <p className="font-semibold mb-1">🔍 Continuous scanning</p>
              <p className="text-sm opacity-90">
                We continuously scan millions of openings to find your top matches
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">⚡ 10x applications</p>
              <p className="text-sm opacity-90">
                Submit 10x as many applications with less effort than one manual application
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">📧 Daily updates</p>
              <p className="text-sm opacity-90">
                Start each day with a list of roles matched to your skills and preferences
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">🤖 AI-powered</p>
              <p className="text-sm opacity-90">
                Reclaim your time by letting our AI handle the grunt work of job searching
              </p>
            </div>
          </div>
          <Link href="/pricing">
            <Button variant="secondary" size="lg" className="min-h-[44px] touch-manipulation">
              See All Job Matches →
            </Button>
          </Link>
        </div>

        {/* Job Detail Modal */}
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            {selectedJob && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl sm:text-3xl">
                    {selectedJob.job.title}
                  </DialogTitle>
                  <p className="text-base sm:text-lg text-text-secondary font-medium mt-1">
                    {selectedJob.job.company}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge className={getMatchColor(selectedJob.matchScore)}>
                      {selectedJob.matchScore}% Match
                    </Badge>
                    <span className="text-sm text-text-secondary">
                      📍 {selectedJob.job.location}
                    </span>
                    {selectedJob.job.remote && (
                      <Badge variant="outline">Remote</Badge>
                    )}
                    <span className="text-sm text-text-secondary">
                      📅 {formatDate(selectedJob.job.postedDate)}
                    </span>
                  </div>
                </DialogHeader>
                <DialogDescription className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-2">Why you're a great fit:</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.reasons.map((reason, idx) => (
                        <Badge key={idx} variant="outline">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-2">Salary:</h3>
                    <p className="text-lg font-semibold">
                      {formatSalary(selectedJob.job.salaryMin, selectedJob.job.salaryMax)}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-2">Job Description:</h3>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                      {selectedJob.job.description}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1 min-h-[44px] touch-manipulation"
                      onClick={() => setSelectedJob(null)}
                    >
                      Close
                    </Button>
                    <Button
                      className="flex-1 min-h-[44px] touch-manipulation"
                      onClick={() => window.open(selectedJob.job.applyUrl, "_blank")}
                    >
                      Apply on Company Site →
                    </Button>
                  </div>
                </DialogDescription>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

