"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";

export default function TasksPage() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [selectedTasks, setSelectedTasks] = useState<string[]>(data.tasks || []);
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isInferringSkills, setIsInferringSkills] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferredSkills, setInferredSkills] = useState<string[]>([]);
  const [selectedInferredSkills, setSelectedInferredSkills] = useState<Set<string>>(new Set());
  const [expandedInferredSkills, setExpandedInferredSkills] = useState(false);

  // Helper function to infer skills - needs to be defined before fetchTasksForRole
  const inferSkillsFromSelectedTasks = useCallback(async (roleTitle: string, companyName: string | undefined, tasksToInfer: string[]) => {
    // Check if user came from resume upload - if so, don't infer here
    const resumeUploaded = sessionStorage.getItem("resume_uploaded");
    if (resumeUploaded === "true") {
      return;
    }
    
    if (!roleTitle || tasksToInfer.length === 0) {
      return;
    }

    console.log(`[Tasks Page] Inferring skills from role "${roleTitle}" and ${tasksToInfer.length} tasks`);
    setIsInferringSkills(true);
    try {
      const response = await fetch("/api/infer-skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: roleTitle.trim(),
          company: companyName?.trim() || undefined,
          tasks: tasksToInfer,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const inferred = result.inferredSkills || [];
        
        if (inferred.length > 0) {
          setInferredSkills(inferred);
          // Auto-select all inferred skills by default
          setSelectedInferredSkills(new Set(inferred));
          // Save to sessionStorage
          sessionStorage.setItem("onboarding_inferred_skills", JSON.stringify(inferred));
          console.log(`[Tasks Page] Inferred ${inferred.length} skills`);
        }
      }
    } catch (error) {
      console.error("Error inferring skills:", error);
    } finally {
      setIsInferringSkills(false);
    }
  }, []);

  const fetchTasksForRole = useCallback(async (roleTitle: string, companyName?: string, preserveSelected: boolean = false, taskCount: number = 4) => {
    if (!roleTitle || roleTitle.trim() === "") return;
    
    // Log for debugging
    console.log(`[Tasks Page] Fetching ${taskCount} tasks for role: "${roleTitle}"${companyName ? ` at ${companyName}` : ""}`);
    
    setIsLoadingTasks(true);
    setError(null);
    
    try {
      const requestBody = {
        role: roleTitle.trim(), // Ensure trimmed role
        company: companyName?.trim() || undefined,
        count: taskCount,
      };
      
      // Log request for debugging
      console.log(`[Tasks Page] API Request:`, requestBody);
      
      const response = await fetch("/api/generate-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to generate tasks");
      }

      const result = await response.json();
      const generatedTasks = result.tasks || [];
      
      if (generatedTasks.length > 0) {
        if (preserveSelected) {
          // Preserve selected tasks and add new tasks to the list
          // Use functional update to access current tasks state
          setTasks(prev => {
            // Filter out tasks that are already in the list (case-insensitive)
            const existingTasksSet = new Set(prev.map(t => t.toLowerCase()));
            const newTasks = generatedTasks.filter(t => !existingTasksSet.has(t.toLowerCase()));
            
            // Return existing tasks plus new ones
            return [...prev, ...newTasks];
          });
          // Keep selected tasks as-is (don't auto-select new ones)
        } else {
          // Initial load: replace all tasks and auto-select first 4
          setTasks(generatedTasks);
          const tasksToSelect = generatedTasks.slice(0, 4);
          setSelectedTasks(tasksToSelect);
          // Save the role with the tasks so we can validate on reload
          sessionStorage.setItem("onboarding_tasks_role", roleTitle);
          
          // Immediately infer skills for auto-selected tasks
          // Check if user came from resume upload - if so, don't infer here
          const resumeUploaded = sessionStorage.getItem("resume_uploaded");
          if (!resumeUploaded || resumeUploaded !== "true") {
            // Trigger skill inference for auto-selected tasks
            setTimeout(() => {
              inferSkillsFromSelectedTasks(roleTitle, companyName, tasksToSelect);
            }, 200);
          }
        }
      } else {
        setError("No tasks were generated. Please try again.");
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks. Please try again.");
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    // Check if role exists - if not, redirect to role page
    const savedRole = sessionStorage.getItem("onboarding_role") || data.role;
    const savedCompany = sessionStorage.getItem("onboarding_company") || data.company || "";
    
    if (!savedRole || savedRole.trim() === "") {
      // No role found, redirect to role input page
      router.push("/onboarding/role");
      return;
    }
    
    // Check if user came from resume upload or manual role entry
    const resumeUploaded = sessionStorage.getItem("resume_uploaded");
    
    // If user manually entered role (no resume), clear any old resume-related data
    if (!resumeUploaded || resumeUploaded !== "true") {
      console.log("[Tasks Page] User manually entered role, clearing any resume-related data");
      // Clear any resume-related tasks/skills to ensure we start fresh
      sessionStorage.removeItem("resume_uploaded");
      sessionStorage.removeItem("resume_parsed_data");
      sessionStorage.removeItem("onboarding_inferred_skills");
      sessionStorage.removeItem("onboarding_inferred_skills_selected");
    }
    
    setRole(savedRole);
    setCompany(savedCompany);
    
    // Only load saved tasks if they were generated for the current role AND user didn't upload resume
    // If user uploaded resume, we should go to resume-review page instead
    if (resumeUploaded === "true") {
      // User uploaded resume, they should be on resume-review page
      // But if they're here, we'll still allow them to continue
      console.log("[Tasks Page] Resume was uploaded, but user is on tasks page");
    }
    
    // Check if we have saved tasks for this specific role (only if no resume)
    const savedTasksRole = sessionStorage.getItem("onboarding_tasks_role");
    const savedTasks = sessionStorage.getItem("onboarding_tasks");
    
    // Only load saved tasks if they match the current role AND no resume was uploaded
    if (!resumeUploaded && savedTasks && savedTasksRole === savedRole) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        setSelectedTasks(parsedTasks);
        setTasks(parsedTasks); // Use saved tasks as the available tasks
        console.log(`[Tasks Page] Loaded ${parsedTasks.length} saved tasks for manually entered role: "${savedRole}"`);
        return; // Don't fetch new tasks if we have saved ones for this role
      } catch (e) {
        console.error("Error parsing saved tasks:", e);
        // Fall through to fetch new tasks
      }
    } else if (savedTasks && savedTasksRole !== savedRole) {
      // Role changed, clear old tasks
      console.log(`[Tasks Page] Role changed from "${savedTasksRole}" to "${savedRole}", clearing old tasks`);
      sessionStorage.removeItem("onboarding_tasks");
      sessionStorage.removeItem("onboarding_tasks_role");
      sessionStorage.removeItem("onboarding_inferred_skills");
      sessionStorage.removeItem("onboarding_inferred_skills_selected");
    }
    
    // If resume was uploaded, don't auto-fetch tasks here (resume-review page handles that)
    // Only fetch if user manually entered role
    if (!resumeUploaded || resumeUploaded !== "true") {
      // Fetch tasks from API for manually entered role
      // Fetch 6 tasks on initial load
      console.log(`[Tasks Page] Fetching tasks for manually entered role: "${savedRole}"`);
      fetchTasksForRole(savedRole, savedCompany, false, 6);
    }

    // Only load inferred skills if they were generated for the current role AND no resume was uploaded
    if (!resumeUploaded || resumeUploaded !== "true") {
      const savedInferredSkills = sessionStorage.getItem("onboarding_inferred_skills");
      if (savedInferredSkills) {
        try {
          const parsed = JSON.parse(savedInferredSkills);
          if (Array.isArray(parsed)) {
            setInferredSkills(parsed);
            // Auto-select all inferred skills by default
            setSelectedInferredSkills(new Set(parsed));
            console.log(`[Tasks Page] Loaded ${parsed.length} inferred skills for manually entered role`);
          }
        } catch (e) {
          console.error("Error parsing saved inferred skills:", e);
        }
      }
    }
  }, [router, data.role, data.company, fetchTasksForRole]);

  // Infer skills whenever selected tasks change (debounced)
  // Only infer skills if user manually entered role (not from resume)
  const inferSkillsFromTasks = useCallback(async () => {
    // Check if user came from resume upload - if so, don't infer here
    const resumeUploaded = sessionStorage.getItem("resume_uploaded");
    if (resumeUploaded === "true") {
      return;
    }
    
    if (!role || selectedTasks.length === 0) {
      return;
    }

    // Use the helper function
    await inferSkillsFromSelectedTasks(role, company, selectedTasks);
  }, [role, company, selectedTasks, inferSkillsFromSelectedTasks]);

  // Debounce skill inference - wait 500ms after tasks change
  // Only if user manually entered role (not from resume)
  useEffect(() => {
    const resumeUploaded = sessionStorage.getItem("resume_uploaded");
    // Only infer if no resume was uploaded (manual role entry)
    if (resumeUploaded === "true") {
      return; // Don't infer skills from tasks if resume was uploaded
    }
    
    if (selectedTasks.length === 0 || !role) return;
    
    const timer = setTimeout(() => {
      inferSkillsFromTasks();
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedTasks, role, company, inferSkillsFromTasks]);

  const toggleTask = (task: string) => {
    setSelectedTasks((prev) =>
      prev.includes(task)
        ? prev.filter((t) => t !== task)
        : [...prev, task]
    );
  };

  const handleSelectAll = () => {
    if (tasks.length === 0) return;
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks([...tasks]);
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
      // Update sessionStorage
      sessionStorage.setItem("onboarding_inferred_skills_selected", JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const handleNext = () => {
    // Save tasks first
    updateData({ tasks: selectedTasks });
    sessionStorage.setItem("onboarding_tasks", JSON.stringify(selectedTasks));
    // Also save the role so we can validate on reload
    if (role) {
      sessionStorage.setItem("onboarding_tasks_role", role);
    }
    
    // Save selected inferred skills
    if (selectedInferredSkills.size > 0) {
      sessionStorage.setItem("onboarding_inferred_skills_selected", JSON.stringify(Array.from(selectedInferredSkills)));
      // Also combine with existing skills if any
      const existingSkills = sessionStorage.getItem("onboarding_skills");
      if (existingSkills) {
        try {
          const parsed = JSON.parse(existingSkills);
          const allSkills = [...new Set([...parsed, ...Array.from(selectedInferredSkills)])];
          updateData({ skills: allSkills });
          sessionStorage.setItem("onboarding_skills", JSON.stringify(allSkills));
        } catch (e) {
          // If parsing fails, just save inferred skills
          updateData({ skills: Array.from(selectedInferredSkills) });
          sessionStorage.setItem("onboarding_skills", JSON.stringify(Array.from(selectedInferredSkills)));
        }
      } else {
        // Save inferred skills as initial skills
        updateData({ skills: Array.from(selectedInferredSkills) });
        sessionStorage.setItem("onboarding_skills", JSON.stringify(Array.from(selectedInferredSkills)));
      }
    }
    
    // Check if interests were already collected (from resume flow)
    const hasInterests = sessionStorage.getItem("onboarding_interests");
    if (hasInterests) {
      router.push("/onboarding/skills");
    } else {
      router.push("/onboarding/interests");
    }
  };

  const handleRegenerate = () => {
    if (!role) return;
    // Preserve selected tasks when regenerating
    fetchTasksForRole(role, company, true);
  };

  // Determine whether to use "a" or "an" based on the role
  const getArticle = (roleTitle: string): string => {
    if (!roleTitle || roleTitle.trim() === "") return "a(n)";
    
    // Get the first word of the role (in case it's "Senior Software Engineer", we want "Senior")
    const firstWord = roleTitle.trim().split(/\s+/)[0].toLowerCase();
    const firstChar = firstWord[0];
    
    // Check if it's an acronym (all uppercase letters)
    const isAcronym = /^[A-Z]{2,}$/.test(firstWord);
    
    if (isAcronym) {
      // For acronyms, check the first letter's sound
      // Letters that sound like they start with a vowel: A, E, F, H, I, L, M, N, O, R, S, X
      // A = "ay", E = "ee", F = "ef", H = "aitch", I = "eye", L = "el", M = "em", N = "en", O = "oh", R = "ar", S = "ess", X = "ex"
      if (/^[aefhilmnorsx]/i.test(firstChar)) {
        return "an";
      }
      return "a";
    }
    
    // Regular words starting with vowel sounds use "an"
    if (/^[aeiou]/.test(firstChar)) {
      return "an";
    }
    
    // Special cases for consonant letters that sound like vowels
    // "an hour" (h is silent), but "a UX" (U sounds like "you")
    // For roles, "UX" starts with "you" sound, so "a UX"
    // "an MBA" (M sounds like "em")
    if (firstWord.startsWith("mba") || firstWord.startsWith("m.")) {
      return "an";
    }
    
    // Default to "a" for consonant sounds
    return "a";
  };

  return (
    <main className="min-h-screen bg-background-page flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl mb-2 leading-tight">
            Select all the tasks you performed as {getArticle(role)} {role || "[Role Title]"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={isLoadingTasks || !role}
              size="sm"
              className="w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              {isLoadingTasks ? "Generating..." : "Re-generate"}
            </Button>
            {tasks.length > 0 && (
              <div className="flex items-center space-x-2 min-h-[44px]">
                <Checkbox
                  id="select-all"
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="w-5 h-5"
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer touch-manipulation"
                >
                  Select all
                </label>
              </div>
            )}
          </div>

          {isLoadingTasks && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-base text-text-secondary">Generating tasks for {role}...</p>
            </div>
          )}

          {error && (
            <div className="text-center text-destructive text-sm p-3 border border-destructive rounded-md">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {!isLoadingTasks && tasks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {tasks.map((task) => (
              <div
                key={task}
                className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all min-h-[60px] flex items-center touch-manipulation ${
                  selectedTasks.includes(task)
                    ? "border-primary bg-primary-light"
                    : "border-gray-200 active:border-primary/50"
                }`}
                onClick={() => toggleTask(task)}
              >
                <div className="flex items-start space-x-3 w-full">
                  <Checkbox
                    checked={selectedTasks.includes(task)}
                    onCheckedChange={() => toggleTask(task)}
                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                  />
                  <p className="text-sm sm:text-base flex-1 leading-snug">{task}</p>
                </div>
              </div>
            ))}
            </div>
          )}

          {!isLoadingTasks && tasks.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-text-secondary">No tasks available. Click "Re-generate" to create tasks for this role.</p>
            </div>
          )}

          {/* Inferred Skills Section */}
          {(inferredSkills.length > 0 || isInferringSkills || (selectedTasks.length > 0 && !isLoadingTasks)) && (
            <div className="pt-6 border-t border-gray-200">
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
              {isInferringSkills && inferredSkills.length === 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <p className="text-xs sm:text-sm text-text-secondary">
                    Analyzing your skills...
                  </p>
                </div>
              )}
              {inferredSkills.length > 0 && (
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
              )}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleNext}
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

