"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";

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
      <Card className="w-full max-w-2xl sm:max-w-4xl lg:max-w-5xl mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center px-4 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-6 sm:pb-8">
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 sm:mb-6 leading-tight font-bold text-text-primary">
            What gets you out of bed?
          </CardTitle>
          <CardDescription className="text-base sm:text-lg md:text-xl lg:text-2xl mt-2 sm:mt-4 text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Describe a career, industry, or field that interests you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 sm:space-y-10 lg:space-y-12 px-4 sm:px-8 lg:px-12 pb-12 sm:pb-16 lg:pb-20">
          <div className="space-y-4 sm:space-y-5">
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
              className={`text-lg sm:text-xl md:text-2xl h-16 sm:h-20 md:h-24 lg:h-28 w-full px-6 sm:px-8 border-2 transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg ${
                error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
              }`}
            />
            {error && (
              <p className="text-sm sm:text-base text-destructive mt-2">
                {error}
              </p>
            )}
            <div className="flex justify-between items-center pt-2">
              <p className="text-sm sm:text-base md:text-lg text-text-tertiary flex items-center gap-2">
                <span className="text-primary">✨</span>
                <span>Share what you're passionate about</span>
              </p>
              <p className={`text-sm sm:text-base md:text-lg font-medium transition-colors ${
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

          <div className="flex justify-end pt-8 sm:pt-10">
            <Button
              onClick={handleNext}
              disabled={!isValid || isSaving}
              className="w-full sm:w-auto px-10 sm:px-14 lg:px-20 py-5 sm:py-7 lg:py-9 text-lg sm:text-xl md:text-2xl min-h-[60px] sm:min-h-[72px] touch-manipulation shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              size="lg"
            >
              {isSaving ? "Saving..." : "Continue →"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

