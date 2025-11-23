"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";

// Example skills - in production, these would come from a larger database
const EXAMPLE_SKILLS = [
  "Financial Modeling",
  "Due Diligence",
  "Relationship Management",
  "Market Analysis",
  "Salesforce",
  "HubSpot",
  "Excel",
  "SQL",
  "Python",
  "Project Management",
  "Data Analysis",
  "Customer Success",
];

export default function SkillsPage() {
  const router = useRouter();
  const { data, updateData, getProfile } = useOnboarding();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [inferredSkills, setInferredSkills] = useState<string[]>([]);
  const [selectedInferredSkills, setSelectedInferredSkills] = useState<Set<string>>(new Set());
  const [expandedInferredSkills, setExpandedInferredSkills] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Check if skills were already collected from resume upload
  // If so, skip this page and redirect to next step
  useEffect(() => {
    const resumeUploaded = sessionStorage.getItem("resume_uploaded");
    const savedSkills = sessionStorage.getItem("onboarding_skills");
    
    // If resume was uploaded, skills should have been collected from resume review page
    // Skip this page and go directly to next step
    if (resumeUploaded === "true" && savedSkills) {
      const hasInterests = sessionStorage.getItem("onboarding_interests");
      if (hasInterests) {
        router.push("/onboarding/preferences");
      } else {
        router.push("/onboarding/interests");
      }
      return;
    }

    // Load inferred skills if they exist (from role + tasks selection)
    const savedInferredSkills = sessionStorage.getItem("onboarding_inferred_skills");
    if (savedInferredSkills) {
      try {
        const parsed = JSON.parse(savedInferredSkills);
        if (Array.isArray(parsed)) {
          setInferredSkills(parsed);
          // Auto-select all inferred skills by default
          setSelectedInferredSkills(new Set(parsed));
        }
      } catch (e) {
        console.error("Error parsing inferred skills:", e);
      }
    }

    // Load previously selected skills if any
    if (savedSkills) {
      try {
        setSelectedSkills(JSON.parse(savedSkills));
      } catch (e) {
        console.error("Error parsing saved skills:", e);
      }
    }
  }, [router]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  };

  const handleSelectAll = () => {
    if (selectedSkills.length === EXAMPLE_SKILLS.length) {
      setSelectedSkills([]);
    } else {
      setSelectedSkills([...EXAMPLE_SKILLS]);
    }
  };

  const toggleInferredSkill = (skill: string) => {
    setSelectedInferredSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skill)) {
        newSet.delete(skill);
      } else {
        newSet.add(skill);
      }
      return newSet;
    });
  };

  const handleNext = async () => {
    // Combine selected skills and inferred skills
    const allSelectedSkills = [
      ...selectedSkills,
      ...Array.from(selectedInferredSkills),
    ];

    if (allSelectedSkills.length >= 3) {
      updateData({ skills: allSelectedSkills });
      sessionStorage.setItem("onboarding_skills", JSON.stringify(allSelectedSkills));
      
      // Check if interests were already collected (from resume flow)
      const hasInterests = sessionStorage.getItem("onboarding_interests");
      if (hasInterests) {
        // Set default preferences if not already set
        const existingPreferences = sessionStorage.getItem("onboarding_preferences");
        if (!existingPreferences) {
          const defaultPreferences = {
            workEnvironment: "flexible",
            location: "",
            includeRemote: true,
            includeInternational: false,
            desiredSalaryMin: 48000,
            desiredSalaryMax: 72000,
            salaryType: "yearly" as const,
          };
          updateData({ preferences: defaultPreferences });
          sessionStorage.setItem("onboarding_preferences", JSON.stringify(defaultPreferences));
        }
        
        // Save user data and navigate to explore
        try {
          const { signInAnonymouslyUser } = await import("@/lib/auth");
          const { createUserOnboarding } = await import("@/lib/firestore");
          
          const user = await signInAnonymouslyUser();
          const profile = getProfile();
          
          if (profile) {
            const matchingTags = [
              ...allSelectedSkills,
              ...(data.tasks || []).map((task: string) => task.toLowerCase()),
              ...(data.interests || []).map((interest: string) => interest.toLowerCase()),
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
          router.push("/explore");
        }
      } else {
        router.push("/onboarding/interests");
      }
    }
  };

  const filteredSkills = EXAMPLE_SKILLS.filter((skill) =>
    skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-background-page flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl mb-2 leading-tight">
            Select at least 3 skills that apply to you
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
          <div className="space-y-3 sm:space-y-4">
            <Input
              type="text"
              placeholder="Enter 3 or more skills or tools"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-base sm:text-lg h-12 w-full"
            />
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <Button
                variant="outline"
                onClick={() => alert("Re-generate skills (AI call)")}
                size="sm"
                className="w-full sm:w-auto min-h-[44px] touch-manipulation"
              >
                Re-generate
              </Button>
              <div className="flex items-center space-x-2 min-h-[44px]">
                <input
                  type="checkbox"
                  id="select-all-skills"
                  checked={selectedSkills.length === EXAMPLE_SKILLS.length}
                  onChange={handleSelectAll}
                  className="cursor-pointer w-5 h-5 touch-manipulation"
                />
                <label
                  htmlFor="select-all-skills"
                  className="text-sm font-medium cursor-pointer touch-manipulation"
                >
                  Select all
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            {filteredSkills.map((skill) => (
              <Badge
                key={skill}
                variant={selectedSkills.includes(skill) ? "default" : "outline"}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base cursor-pointer transition-all min-h-[44px] flex items-center touch-manipulation ${
                  selectedSkills.includes(skill)
                    ? "bg-primary text-white active:bg-primary/90"
                    : "active:bg-primary-light"
                }`}
                onClick={() => toggleSkill(skill)}
              >
                {skill}
              </Badge>
            ))}
          </div>

          {/* Inferred Skills Section */}
          {inferredSkills.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-text-primary">
                    Skills we inferred from your experience
                  </p>
                  <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                    Based on your role and selected tasks
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {(expandedInferredSkills ? inferredSkills : inferredSkills.slice(0, 15)).map((skill, idx) => {
                  const isSelected = selectedInferredSkills.has(skill);
                  return (
                    <Badge 
                      key={idx} 
                      variant="outline"
                      className={`text-xs sm:text-sm px-3 py-1.5 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary-light/50 border-primary/30 text-text-primary hover:border-primary/50 hover:bg-primary-light"
                          : "bg-gray-50 border-gray-300 text-text-secondary opacity-60 hover:opacity-100 hover:border-gray-400"
                      }`}
                      onClick={() => toggleInferredSkill(skill)}
                    >
                      {skill}
                    </Badge>
                  );
                })}
                {inferredSkills.length > 15 && (
                  <Badge 
                    variant="outline" 
                    className="text-xs sm:text-sm px-3 py-1.5 bg-white border-gray-200 text-text-secondary cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    onClick={() => setExpandedInferredSkills(!expandedInferredSkills)}
                  >
                    {expandedInferredSkills 
                      ? "Show less" 
                      : `+${inferredSkills.length - 15} more`}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {selectedSkills.length + selectedInferredSkills.size > 0 && selectedSkills.length + selectedInferredSkills.size < 3 && (
            <p className="text-xs sm:text-sm text-warning text-center">
              Please select at least 3 skills ({selectedSkills.length + selectedInferredSkills.size}/3)
            </p>
          )}

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleNext}
              disabled={selectedSkills.length + selectedInferredSkills.size < 3}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-6 text-base sm:text-lg min-h-[44px] touch-manipulation"
              size="lg"
            >
              Next →
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

