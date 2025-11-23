"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile } from "@/types/user";

interface OnboardingData {
  role: string;
  company?: string;
  resumeData?: any;
  tasks: string[];
  skills: string[];
  interests: string[];
  preferences?: {
    workEnvironment: string;
    location: string;
    includeRemote: boolean;
    desiredSalaryMin: number;
    desiredSalaryMax: number;
    salaryType: "yearly" | "hourly";
  };
}

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  clearData: () => void;
  getProfile: () => UserProfile | null;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>({
    role: "",
    company: "",
    tasks: [],
    skills: [],
    interests: [],
  });

  // Load from sessionStorage on mount
  useEffect(() => {
    const savedResume = sessionStorage.getItem("resume_uploaded");
    const resumeWasUploaded = savedResume === "true";
    
    // Check if resume was uploaded - if so, use ONLY resume data
    if (resumeWasUploaded) {
      const resumeParsedData = sessionStorage.getItem("resume_parsed_data");
      const savedSelectedRoles = sessionStorage.getItem("onboarding_selected_roles");
      
      if (resumeParsedData) {
        try {
          const parsed = JSON.parse(resumeParsedData);
          
          // Extract role from selected roles (most recent or first selected)
          let role = "";
          let company = "";
          if (savedSelectedRoles) {
            const rolesInfo = JSON.parse(savedSelectedRoles);
            if (rolesInfo && rolesInfo.length > 0) {
              // Use the first selected role (most recent)
              role = rolesInfo[0].title || "";
              company = rolesInfo[0].company || "";
            }
          }
          
          // If no selected roles, try to get from experience
          if (!role && parsed.experience && parsed.experience.length > 0) {
            // Get the first work experience role
            const workExp = parsed.experience.find((exp: any) => !exp.type || exp.type === "work");
            if (workExp) {
              role = workExp.title || "";
              company = workExp.company || "";
            } else {
              // Fallback to first experience
              role = parsed.experience[0].title || "";
              company = parsed.experience[0].company || "";
            }
          }
          
          // Get tasks and skills from resume flow (saved by resume-review page)
          const savedTasks = sessionStorage.getItem("onboarding_tasks");
          const savedSkills = sessionStorage.getItem("onboarding_skills");
          
          // Get interests (these are collected after resume review)
          const savedInterests = sessionStorage.getItem("onboarding_interests");
          const savedPreferences = sessionStorage.getItem("onboarding_preferences");
          
          setData({
            role: role,
            company: company,
            tasks: savedTasks ? JSON.parse(savedTasks) : [],
            skills: savedSkills ? JSON.parse(savedSkills) : [],
            interests: savedInterests ? JSON.parse(savedInterests) : [],
            preferences: savedPreferences ? JSON.parse(savedPreferences) : undefined,
            resumeData: { uploaded: true, parsedData: parsed },
          });
          
          console.log("[OnboardingContext] Loaded data from resume upload");
          return;
        } catch (e) {
          console.error("[OnboardingContext] Error parsing resume data:", e);
          // Fall through to manual entry data
        }
      }
    }
    
    // If resume was NOT uploaded, use ONLY manually entered data
    // Clear any resume-related data to ensure clean separation
    const savedRole = sessionStorage.getItem("onboarding_role");
    const savedCompany = sessionStorage.getItem("onboarding_company");
    const savedTasks = sessionStorage.getItem("onboarding_tasks");
    const savedSkills = sessionStorage.getItem("onboarding_skills");
    const savedInterests = sessionStorage.getItem("onboarding_interests");
    const savedPreferences = sessionStorage.getItem("onboarding_preferences");
    
    // Only use data if it's from manual entry (check that resume wasn't uploaded)
    // If resume was uploaded but we're here, something went wrong - use manual data anyway
    setData({
      role: savedRole || "",
      company: savedCompany || "",
      tasks: savedTasks ? JSON.parse(savedTasks) : [],
      skills: savedSkills ? JSON.parse(savedSkills) : [],
      interests: savedInterests ? JSON.parse(savedInterests) : [],
      preferences: savedPreferences ? JSON.parse(savedPreferences) : undefined,
      resumeData: undefined,
    });
    
    console.log("[OnboardingContext] Loaded data from manual entry");
  }, []);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => {
      const newData = { ...prev, ...updates };
      
      // Persist to sessionStorage
      if (updates.role !== undefined) {
        sessionStorage.setItem("onboarding_role", updates.role);
      }
      if (updates.company !== undefined) {
        sessionStorage.setItem("onboarding_company", updates.company);
      }
      if (updates.tasks !== undefined) {
        sessionStorage.setItem("onboarding_tasks", JSON.stringify(updates.tasks));
      }
      if (updates.skills !== undefined) {
        sessionStorage.setItem("onboarding_skills", JSON.stringify(updates.skills));
      }
      if (updates.interests !== undefined) {
        sessionStorage.setItem("onboarding_interests", JSON.stringify(updates.interests));
      }
      if (updates.preferences !== undefined) {
        sessionStorage.setItem("onboarding_preferences", JSON.stringify(updates.preferences));
      }
      
      return newData;
    });
  };

  const clearData = () => {
    setData({
      role: "",
      company: "",
      tasks: [],
      skills: [],
      interests: [],
    });
    sessionStorage.clear();
  };

  const getProfile = (): UserProfile | null => {
    if (!data.preferences) return null;

    return {
      selectedTasks: data.tasks,
      selectedSkills: data.skills,
      interests: data.interests,
      workEnvironmentPref: data.preferences.workEnvironment as "remote" | "hybrid" | "office" | "flexible",
      locations: data.preferences.location ? [data.preferences.location] : [],
      includeRemote: data.preferences.includeRemote,
      desiredSalaryMin: data.preferences.desiredSalaryMin,
      desiredSalaryMax: data.preferences.desiredSalaryMax,
      salaryType: data.preferences.salaryType,
    };
  };

  return (
    <OnboardingContext.Provider value={{ data, updateData, clearData, getProfile }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}

