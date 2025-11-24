"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { BackButton } from "@/components/back-button";

export default function InterestsPage() {
  const router = useRouter();
  const { data, updateData, getProfile } = useOnboarding();
  const [interest, setInterest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleNext = async () => {
    // Validate: must have at least 1 word
    const trimmedInterest = interest.trim();
    const wordCount = trimmedInterest.split(/\s+/).filter(word => word.length > 0).length;
    
    if (wordCount < 1) {
      setError("Please enter at least one word");
      return;
    }
    
    if (trimmedInterest.length === 0) {
      setError("Please enter your interest");
      return;
    }
    
    if (characterCount > maxLength) {
      setError(`Please keep your input under ${maxLength} characters`);
      return;
    }

    // Clear any previous errors
    setError(null);
    setIsSaving(true);
    
    try {
      // Store as array for compatibility with existing code
      const interestsArray = [trimmedInterest];
      updateData({ interests: interestsArray });
      sessionStorage.setItem("onboarding_interests", JSON.stringify(interestsArray));
      
      // Set default preferences if not already set
      const existingPreferences = sessionStorage.getItem("onboarding_preferences");
      if (!existingPreferences) {
        const defaultPreferences = {
          workEnvironment: "flexible",
          location: "",
          includeRemote: true,
          includeInternational: false,
          desiredSalaryMin: 48000, // 80% of 60K default
          desiredSalaryMax: 72000, // 120% of 60K default
          salaryType: "yearly" as const,
        };
        updateData({ preferences: defaultPreferences });
        sessionStorage.setItem("onboarding_preferences", JSON.stringify(defaultPreferences));
      }
      
      // Sign in anonymously and save to Firestore
      const { signInAnonymouslyUser } = await import("@/lib/auth");
      const { createUserOnboarding } = await import("@/lib/firestore");
      
      const user = await signInAnonymouslyUser();
      
      // Get the complete profile
      const profile = getProfile();
      
      if (!profile) {
        // Create profile from sessionStorage data
        const role = sessionStorage.getItem("onboarding_role") || data.role || "";
        const company = sessionStorage.getItem("onboarding_company") || data.company || "";
        const tasks = sessionStorage.getItem("onboarding_tasks") ? JSON.parse(sessionStorage.getItem("onboarding_tasks")!) : (data.tasks || []);
        const skills = sessionStorage.getItem("onboarding_skills") ? JSON.parse(sessionStorage.getItem("onboarding_skills")!) : (data.skills || []);
        const preferences = existingPreferences ? JSON.parse(existingPreferences) : JSON.parse(sessionStorage.getItem("onboarding_preferences")!);
        
        const manualProfile = {
          selectedTasks: tasks,
          selectedSkills: skills,
          interests: interestsArray,
          workEnvironmentPref: preferences.workEnvironment as "remote" | "hybrid" | "office" | "flexible",
          locations: preferences.location ? [preferences.location] : [],
          includeRemote: preferences.includeRemote,
          desiredSalaryMin: preferences.desiredSalaryMin,
          desiredSalaryMax: preferences.desiredSalaryMax,
          salaryType: preferences.salaryType,
        };
        
        // Generate matching tags
        const matchingTags = [
          ...skills,
          ...tasks.map((task: string) => task.toLowerCase()),
          ...interestsArray.map((interest: string) => interest.toLowerCase()),
        ];
        
        // Save to Firestore
        await createUserOnboarding(user.uid, {
          currentRole: role,
          currentCompany: company,
          profile: manualProfile,
          matchingTags,
        });
      } else {
        // Use profile from context
        const matchingTags = [
          ...(data.skills || []),
          ...(data.tasks || []).map((task: string) => task.toLowerCase()),
          ...interestsArray.map((interest: string) => interest.toLowerCase()),
        ];
        
        await createUserOnboarding(user.uid, {
          currentRole: data.role,
          currentCompany: data.company,
          profile,
          matchingTags,
        });
      }
      
      router.push("/explore");
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      // Still navigate to explore even if save fails
      router.push("/explore");
    } finally {
      setIsSaving(false);
    }
  };

  const characterCount = interest.length;
  const maxLength = 50;
  const trimmedInterest = interest.trim();
  const wordCount = trimmedInterest.split(/\s+/).filter(word => word.length > 0).length;
  const isValid = wordCount >= 1 && characterCount <= maxLength;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background-page via-background-page to-primary/5 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-xl mx-auto">
        <div className="mb-4">
          <BackButton />
        </div>
        <Card className="w-full shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl mb-3 sm:mb-4 leading-tight font-bold text-text-primary">
            What gets you out of bed?
          </CardTitle>
          <CardDescription className="text-sm sm:text-base md:text-lg mt-2 text-text-secondary max-w-xl mx-auto">
            Describe a career, industry, or field that interests you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
          <div className="space-y-3 sm:space-y-4">
            <Input
              id="interest-input"
              type="text"
              placeholder="e.g., Music, Fitness, Technology, Art, Travel..."
              value={interest}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= maxLength) {
                  setInterest(value);
                  // Clear error when user starts typing
                  if (error) {
                    setError(null);
                  }
                }
              }}
              onBlur={() => {
                // Validate on blur
                const trimmed = interest.trim();
                const words = trimmed.split(/\s+/).filter(word => word.length > 0);
                if (trimmed.length > 0 && words.length < 1) {
                  setError("Please enter at least one word");
                }
              }}
              maxLength={maxLength}
              className={`text-base sm:text-lg h-12 sm:h-14 w-full px-4 sm:px-6 border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg ${
                error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
              }`}
            />
            {error && (
              <p className="text-sm text-destructive mt-1">
                {error}
              </p>
            )}
            <div className="flex justify-between items-center pt-1">
              <p className="text-xs sm:text-sm text-text-tertiary flex items-center gap-2">
                <span className="text-primary">✨</span>
                <span>Share what you're passionate about</span>
              </p>
              <p className={`text-xs sm:text-sm font-medium transition-colors ${
                characterCount > maxLength * 0.9 
                  ? "text-warning" 
                  : characterCount > 0
                  ? "text-primary"
                  : "text-text-tertiary"
              }`}>
                {characterCount}/{maxLength}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 sm:pt-6">
            <Button
              onClick={handleNext}
              disabled={!isValid || isSaving}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg min-h-[44px] touch-manipulation shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              size="lg"
            >
              {isSaving ? "Saving..." : "Continue →"}
            </Button>
          </div>
        </CardContent>
        </Card>
      </div>
    </main>
  );
}

