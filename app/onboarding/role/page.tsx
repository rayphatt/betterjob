"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { BackButton } from "@/components/back-button";

export default function RoleInputPage() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [role, setRole] = useState(data.role || "");
  const [company, setCompany] = useState(data.company || "");

  const isValid = role.trim().length > 0;

  const handleNext = () => {
    if (isValid) {
      // Clear any resume-related data since user is manually entering role
      // This ensures we start fresh and don't use old resume data
      sessionStorage.removeItem("resume_uploaded");
      sessionStorage.removeItem("resume_parsed_data");
      sessionStorage.removeItem("onboarding_tasks"); // Clear old tasks from resume
      sessionStorage.removeItem("onboarding_skills"); // Clear old skills from resume
      sessionStorage.removeItem("onboarding_inferred_skills"); // Clear old inferred skills
      sessionStorage.removeItem("onboarding_inferred_skills_selected");
      sessionStorage.removeItem("onboarding_tasks_role"); // Clear old task-role mapping
      
      // Update onboarding context
      updateData({ role, company });
      // Also store in sessionStorage for backward compatibility
      sessionStorage.setItem("onboarding_role", role);
      sessionStorage.setItem("onboarding_company", company);
      router.push("/onboarding/tasks");
    }
  };

  return (
    <main className="min-h-screen bg-background-page flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-4">
          <BackButton />
        </div>
        <Card className="w-full">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8">
          <CardTitle className="text-2xl sm:text-3xl mb-2 leading-tight">
            What role have you worked in?
          </CardTitle>
          <CardDescription className="text-base sm:text-lg mt-2">
            Share a current or previous role and where you worked
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
          <div className="space-y-2">
            <Label htmlFor="role-input" className="text-base sm:text-lg font-semibold">
              Role Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role-input"
              type="text"
              placeholder="e.g., SDR, Sales, PA, Account Executive, Software Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="text-base sm:text-lg h-12 sm:h-14 w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-input" className="text-base sm:text-lg font-semibold">
              Company or Industry
            </Label>
            <Input
              id="company-input"
              type="text"
              placeholder="e.g., Salesforce, Technology, Healthcare, Finance"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="text-base sm:text-lg h-12 w-full"
            />
            <p className="text-xs sm:text-sm text-text-tertiary">
              This helps us match you with relevant roles in similar companies or industries
            </p>
          </div>

          <p className="text-xs sm:text-sm text-text-tertiary text-center px-2">
            💡 Have a military occupation code (MOS, AFSC, NEC)? You can enter it in the role field above
          </p>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleNext}
              disabled={!isValid}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-6 text-base sm:text-lg min-h-[44px] touch-manipulation"
              size="lg"
            >
              Next →
            </Button>
          </div>
        </CardContent>
        </Card>
      </div>
    </main>
  );
}

