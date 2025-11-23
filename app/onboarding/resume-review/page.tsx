"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Edit2, Check, X, Briefcase, Sparkles, Loader2 } from "lucide-react";

interface ParsedExperience {
  title: string;
  company: string;
  duration: string;
  description: string;
  type?: "work" | "leadership" | "volunteer" | "education" | "other";
  generatedTasks?: string[];
}

interface ParsedResumeData {
  skills: string[]; // Explicitly listed skills
  inferredSkills?: string[]; // Skills inferred from descriptions
  experience: ParsedExperience[];
  education: string[];
  yearsExperience: number;
}

export default function ResumeReviewPage() {
  const router = useRouter();
  const [resumeData, setResumeData] = useState<ParsedResumeData | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set());
  const [roleTasks, setRoleTasks] = useState<Record<number, string[]>>({});
  const [selectedTasks, setSelectedTasks] = useState<Record<number, Set<string>>>({});
  const [isLoadingTasks, setIsLoadingTasks] = useState<Record<number, boolean>>({});
  const [editingRole, setEditingRole] = useState<number | null>(null);
  const [editedRoles, setEditedRoles] = useState<Record<number, { title: string; company: string }>>({});
  const [expandedExplicitSkills, setExpandedExplicitSkills] = useState(false);
  const [expandedInferredSkills, setExpandedInferredSkills] = useState(false);
  const [selectedExplicitSkills, setSelectedExplicitSkills] = useState<Set<string>>(new Set());
  const [selectedInferredSkills, setSelectedInferredSkills] = useState<Set<string>>(new Set());

  useEffect(() => {
    const savedData = sessionStorage.getItem("resume_parsed_data");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setResumeData(parsed);
        
        // Filter to only work experience roles for selection
        // Work experience is most relevant for career matching
        const experienceArray = parsed.experience || [];
        const workExperienceIndices = experienceArray
          .map((exp: any, idx: number) => {
            // Include roles with type "work" or no type (for backward compatibility)
            if (!exp.type || exp.type === "work") {
              return idx;
            }
            return null;
          })
          .filter((idx: number | null) => idx !== null) as number[];
        
        // Auto-select only work experience roles by default
        const workRoles = new Set<number>(workExperienceIndices);
        setSelectedRoles(workRoles);
        
        console.log(`Found ${workExperienceIndices.length} work experience role(s) out of ${experienceArray.length} total role(s)`);
        
        // Load pre-generated tasks if they exist (tasks are only generated for work experience)
        const tasksMap: Record<number, string[]> = {};
        const selectedMap: Record<number, Set<string>> = {};
        
        experienceArray.forEach((exp: any, idx: number) => {
          // Only load tasks for work experience roles
          if ((!exp.type || exp.type === "work") && exp.generatedTasks && Array.isArray(exp.generatedTasks) && exp.generatedTasks.length > 0) {
            tasksMap[idx] = exp.generatedTasks;
            // Auto-select first 3 tasks from the 4 generated tasks
            const tasksToSelect = exp.generatedTasks.slice(0, 3);
            selectedMap[idx] = new Set(tasksToSelect);
          }
        });
        
        if (Object.keys(tasksMap).length > 0) {
          setRoleTasks(tasksMap);
          setSelectedTasks(selectedMap);
          console.log(`Loaded pre-generated tasks for ${Object.keys(tasksMap).length} role(s)`);
        }

        // Initialize all skills as selected by default
        if (parsed.skills && Array.isArray(parsed.skills)) {
          setSelectedExplicitSkills(new Set(parsed.skills));
        }
        if (parsed.inferredSkills && Array.isArray(parsed.inferredSkills)) {
          setSelectedInferredSkills(new Set(parsed.inferredSkills));
        }
      } catch (e) {
        console.error("Error parsing resume data:", e);
        router.push("/onboarding/role");
      }
    } else {
      router.push("/onboarding/resume");
    }
  }, [router]);

  const generateTasksForRole = async (roleIndex: number, role: ParsedExperience, preserveSelected: boolean = false) => {
    setIsLoadingTasks(prev => ({ ...prev, [roleIndex]: true }));
    
    try {
      const response = await fetch("/api/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editedRoles[roleIndex]?.title || role.title,
          company: editedRoles[roleIndex]?.company || role.company,
          count: 4, // Generate 4 new tasks
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const newTasks = result.tasks || [];
        
        if (preserveSelected && roleTasks[roleIndex]?.length > 0) {
          // Preserve selected tasks and add new tasks to the list
          const existingTasks = roleTasks[roleIndex] || [];
          const existingTasksSet = new Set(existingTasks.map((t: string) => t.toLowerCase()));
          const filteredNewTasks = newTasks.filter((t: string) => !existingTasksSet.has(t.toLowerCase()));
          
          // Add new tasks to existing ones
          const allTasks = [...existingTasks, ...filteredNewTasks];
          setRoleTasks(prev => ({ ...prev, [roleIndex]: allTasks }));
          
          // Keep selected tasks as-is (don't auto-select new ones)
          // Selected tasks are already in selectedTasks[roleIndex], so no need to update
        } else {
          // Initial load: replace all tasks and auto-select first 3
          setRoleTasks(prev => ({ ...prev, [roleIndex]: newTasks }));
          const tasksToSelect = newTasks.slice(0, 3);
          setSelectedTasks(prev => ({
            ...prev,
            [roleIndex]: new Set(tasksToSelect),
          }));
        }
      }
    } catch (error) {
      console.error("Error generating tasks:", error);
    } finally {
      setIsLoadingTasks(prev => ({ ...prev, [roleIndex]: false }));
    }
  };

  const toggleRole = (index: number) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
      // Only generate tasks if they don't already exist
      // Pre-generated tasks from resume parsing should already be loaded
      if (resumeData?.experience[index] && (!roleTasks[index] || roleTasks[index].length === 0)) {
        generateTasksForRole(index, resumeData.experience[index], false);
      }
    }
    setSelectedRoles(newSelected);
  };

  const toggleTask = (roleIndex: number, task: string) => {
    const current = selectedTasks[roleIndex] || new Set();
    const newSet = new Set(current);
    if (newSet.has(task)) {
      newSet.delete(task);
    } else {
      newSet.add(task);
    }
    setSelectedTasks(prev => ({ ...prev, [roleIndex]: newSet }));
  };

  const toggleExplicitSkill = (skill: string) => {
    setSelectedExplicitSkills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(skill)) {
        newSet.delete(skill);
      } else {
        newSet.add(skill);
      }
      return newSet;
    });
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

  const handleContinue = () => {
    // Collect all selected tasks from all selected roles
    const allTasks: string[] = [];
    selectedRoles.forEach(roleIndex => {
      const tasks = selectedTasks[roleIndex] || new Set();
      tasks.forEach(task => allTasks.push(task));
    });

    // Collect all selected skills (both explicit and inferred)
    const allSelectedSkills = [
      ...Array.from(selectedExplicitSkills),
      ...Array.from(selectedInferredSkills),
    ];

    // Save selected roles info
    const rolesInfo = Array.from(selectedRoles).map(idx => ({
      title: editedRoles[idx]?.title || resumeData?.experience[idx].title,
      company: editedRoles[idx]?.company || resumeData?.experience[idx].company,
    }));
    sessionStorage.setItem("onboarding_selected_roles", JSON.stringify(rolesInfo));
    
    // Save the primary role (first selected role) to onboarding_role for consistency
    // This ensures the explore page can find the role even if it only checks onboarding_role
    if (rolesInfo && rolesInfo.length > 0) {
      sessionStorage.setItem("onboarding_role", rolesInfo[0].title || "");
      sessionStorage.setItem("onboarding_company", rolesInfo[0].company || "");
    }

    // Save to sessionStorage - these are from resume, so they should be used exclusively
    sessionStorage.setItem("onboarding_tasks", JSON.stringify(allTasks));
    sessionStorage.setItem("onboarding_skills", JSON.stringify(allSelectedSkills));
    
    // Ensure resume_uploaded flag is set
    sessionStorage.setItem("resume_uploaded", "true");

    router.push("/onboarding/interests");
  };

  if (!resumeData) {
    return (
      <main className="min-h-screen bg-background-page flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background-page py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-full flex items-center justify-center">
                <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Review your experience
            </CardTitle>
            <CardDescription className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto">
              We found <span className="font-semibold text-text-primary">{resumeData.experience?.length || 0}</span> role{resumeData.experience?.length !== 1 ? 's' : ''} on your resume. 
              <span className="block mt-2">
                Work experience has been auto-selected for career matching. You can include leadership roles if relevant to your career goals.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
            {/* Experience Roles */}
            {resumeData.experience?.map((exp, idx) => {
              const isSelected = selectedRoles.has(idx);
              const tasks = roleTasks[idx] || [];
              const selectedTasksForRole = selectedTasks[idx] || new Set();
              const isEditing = editingRole === idx;
              const edited = editedRoles[idx] || { title: exp.title, company: exp.company };

              return (
                <Card
                  key={idx}
                  className={`transition-all duration-200 ${
                    isSelected 
                      ? "border-2 border-primary bg-gradient-to-br from-primary-light/50 to-primary-light/30 shadow-md" 
                      : "border border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <CardContent className="p-5 sm:p-6">
                    {/* Role Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-3">
                            <Input
                              value={edited.title}
                              onChange={(e) =>
                                setEditedRoles(prev => ({
                                  ...prev,
                                  [idx]: { ...edited, title: e.target.value },
                                }))
                              }
                              placeholder="Job title"
                              className="text-base font-semibold"
                            />
                            <Input
                              value={edited.company}
                              onChange={(e) =>
                                setEditedRoles(prev => ({
                                  ...prev,
                                  [idx]: { ...edited, company: e.target.value },
                                }))
                              }
                              placeholder="Company name"
                              className="text-sm"
                            />
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingRole(null);
                                  generateTasksForRole(idx, {
                                    ...exp,
                                    title: edited.title,
                                    company: edited.company,
                                  });
                                }}
                                className="gap-1.5"
                              >
                                <Check className="w-4 h-4" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingRole(null);
                                  setEditedRoles(prev => {
                                    const newEdited = { ...prev };
                                    delete newEdited[idx];
                                    return newEdited;
                                  });
                                }}
                                className="gap-1.5"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <h3 className="text-xl sm:text-2xl font-bold text-text-primary">
                                {edited.title}
                              </h3>
                              {exp.type && exp.type !== "work" && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    exp.type === "leadership" 
                                      ? "bg-blue-50 text-blue-700 border-blue-300"
                                      : exp.type === "volunteer"
                                      ? "bg-green-50 text-green-700 border-green-300"
                                      : exp.type === "education"
                                      ? "bg-purple-50 text-purple-700 border-purple-300"
                                      : "bg-gray-50 text-gray-700 border-gray-300"
                                  }`}
                                >
                                  {exp.type === "leadership" ? "🏆 Leadership" :
                                   exp.type === "volunteer" ? "❤️ Volunteer" :
                                   exp.type === "education" ? "📚 Education" :
                                   exp.type === "other" ? "📋 Other" : ""}
                                </Badge>
                              )}
                              {(!exp.type || exp.type === "work") && (
                                <Badge variant="outline" className="text-xs bg-primary-light text-primary border-primary">
                                  💼 Work Experience
                                </Badge>
                              )}
                            </div>
                            <p className="text-base sm:text-lg text-text-secondary font-medium mb-1">
                              {edited.company}
                            </p>
                            <p className="text-xs sm:text-sm text-text-tertiary">
                              {exp.duration}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-2 ml-4 flex-shrink-0">
                        {!isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRole(idx)}
                            className="text-text-secondary hover:text-text-primary hover:bg-gray-100 h-8 px-2 sm:px-3"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="hidden sm:inline ml-1.5">Edit</span>
                          </Button>
                        )}
                        <div 
                          className={`flex items-center justify-center w-8 h-8 rounded-md border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? "bg-primary border-primary text-white" 
                              : "border-gray-300 hover:border-primary/50 bg-white"
                          }`}
                          onClick={() => toggleRole(idx)}
                        >
                          {isSelected && <Check className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {exp.description && (
                      <div className="mb-5 pb-4 border-b border-gray-100">
                        <p className="text-sm sm:text-base text-text-secondary leading-relaxed line-clamp-3">
                          {exp.description}
                        </p>
                      </div>
                    )}

                    {/* Tasks Section */}
                    {isSelected && (
                      <div className="mt-5 pt-5 border-t border-gray-200">
                        {tasks.length === 0 && !isLoadingTasks[idx] && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateTasksForRole(idx, exp, false)}
                            className="mb-4 gap-2 hover:bg-primary-light hover:border-primary transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                            Generate tasks for this role
                          </Button>
                        )}

                        {isLoadingTasks[idx] && (
                          <div className="flex items-center gap-3 text-sm text-text-secondary mb-4 p-4 bg-gray-50 rounded-lg">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span>Generating tasks based on your role...</span>
                          </div>
                        )}

                        {tasks.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                <p className="text-xs sm:text-sm font-semibold text-text-primary">
                                  Select the tasks you performed in this role:
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateTasksForRole(idx, exp, true)}
                                disabled={isLoadingTasks[idx]}
                                className="gap-2 hover:bg-primary-light hover:border-primary transition-colors min-h-[36px] text-xs sm:text-sm"
                              >
                                {isLoadingTasks[idx] ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  "Re-generate"
                                )}
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {tasks.map((task) => {
                                const isTaskSelected = selectedTasksForRole.has(task);
                                return (
                                  <div
                                    key={task}
                                    className={`group flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                      isTaskSelected
                                        ? "border-primary bg-primary-light shadow-sm"
                                        : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                                    }`}
                                    onClick={() => toggleTask(idx, task)}
                                  >
                                    <div 
                                      className={`flex items-center justify-center w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 transition-all ${
                                        isTaskSelected
                                          ? "bg-primary border-primary"
                                          : "border-gray-300 group-hover:border-primary/50"
                                      }`}
                                    >
                                      {isTaskSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <p className={`text-xs sm:text-sm flex-1 leading-relaxed ${
                                      isTaskSelected ? "text-text-primary font-medium" : "text-text-secondary"
                                    }`}>
                                      {task}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Skills Preview */}
            {(resumeData.skills && resumeData.skills.length > 0) || (resumeData.inferredSkills && resumeData.inferredSkills.length > 0) ? (
              <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
                <CardContent className="p-5 sm:p-6 space-y-5">
                  {/* Explicitly Listed Skills */}
                  {resumeData.skills && resumeData.skills.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-base sm:text-lg font-semibold text-text-primary">
                          Skills we found on your resume
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {(expandedExplicitSkills ? resumeData.skills : resumeData.skills.slice(0, 15)).map((skill, idx) => {
                          const isSelected = selectedExplicitSkills.has(skill);
                          return (
                            <Badge 
                              key={idx} 
                              variant={isSelected ? "secondary" : "outline"}
                              className={`text-xs sm:text-sm px-3 py-1.5 cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-white border-gray-200 text-text-primary hover:border-primary/50"
                                  : "bg-gray-50 border-gray-300 text-text-secondary opacity-60 hover:opacity-100 hover:border-gray-400"
                              }`}
                              onClick={() => toggleExplicitSkill(skill)}
                            >
                              {skill}
                            </Badge>
                          );
                        })}
                        {resumeData.skills.length > 15 && (
                          <Badge 
                            variant="outline" 
                            className="text-xs sm:text-sm px-3 py-1.5 bg-white border-gray-200 text-text-secondary cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors"
                            onClick={() => setExpandedExplicitSkills(!expandedExplicitSkills)}
                          >
                            {expandedExplicitSkills 
                              ? "Show less" 
                              : `+${resumeData.skills.length - 15} more`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inferred Skills */}
                  {resumeData.inferredSkills && resumeData.inferredSkills.length > 0 && (
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
                            Based on your job descriptions and responsibilities
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {(expandedInferredSkills ? resumeData.inferredSkills : resumeData.inferredSkills.slice(0, 15)).map((skill, idx) => {
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
                        {resumeData.inferredSkills.length > 15 && (
                          <Badge 
                            variant="outline" 
                            className="text-xs sm:text-sm px-3 py-1.5 bg-white border-gray-200 text-text-secondary cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors"
                            onClick={() => setExpandedInferredSkills(!expandedInferredSkills)}
                          >
                            {expandedInferredSkills 
                              ? "Show less" 
                              : `+${resumeData.inferredSkills.length - 15} more`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Continue Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <Button
                onClick={handleContinue}
                disabled={selectedRoles.size === 0}
                className="w-full sm:w-auto px-8 sm:px-10 py-6 sm:py-7 text-base sm:text-lg font-semibold min-h-[48px] shadow-lg hover:shadow-xl transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                Continue to Interests
                <span className="ml-2">→</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

