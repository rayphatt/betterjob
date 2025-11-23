import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { getDbInstance } from "./firebase";
import { User, UserProfile } from "@/types/user";

export async function saveUserProfile(uid: string, profileData: Partial<User>) {
  try {
    const db = getDbInstance();
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        ...profileData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<User | null> {
  try {
    const db = getDbInstance();
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as User;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
}

export async function createUserOnboarding(
  uid: string,
  onboardingData: {
    currentRole: string;
    currentCompany?: string;
    profile: UserProfile;
    matchingTags?: string[];
  }
) {
  try {
    const db = getDbInstance();
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        uid,
        ...onboardingData,
        subscriptionTier: "free",
        subscriptionStatus: "active",
        createdAt: serverTimestamp(),
        matchingTags: onboardingData.matchingTags || [],
        careerPathsExplored: [],
        likedJobs: [],
        dislikedJobs: [],
        hiddenJobs: [],
        savedJobs: [],
        appliedJobs: [],
        emailNotifications: true,
        emailFrequency: "daily",
      },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    console.error("Error creating user onboarding:", error);
    throw error;
  }
}

// Career paths caching functions
export async function getCachedCareerPaths(cacheKey: string) {
  try {
    const db = getDbInstance();
    const cacheRef = doc(db, "career_paths_cache", cacheKey);
    const cacheSnap = await getDoc(cacheRef);
    
    if (cacheSnap.exists()) {
      const data = cacheSnap.data();
      const cachedAt = data.cachedAt?.toMillis() || 0;
      const now = Date.now();
      const cacheAge = now - cachedAt;
      const cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      
      // Return cached data if it's less than 7 days old
      if (cacheAge < cacheExpiry) {
        return data.careerPaths || null;
      } else {
        // Delete expired cache
        await setDoc(cacheRef, { cachedAt: null }, { merge: true });
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting cached career paths:", error);
    return null;
  }
}

export async function setCachedCareerPaths(cacheKey: string, careerPaths: any[]) {
  try {
    const db = getDbInstance();
    const cacheRef = doc(db, "career_paths_cache", cacheKey);
    await setDoc(
      cacheRef,
      {
        careerPaths,
        cachedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    console.error("Error caching career paths:", error);
    // Don't throw - caching failure shouldn't break the flow
    return { success: false };
  }
}

function generateCacheKey(data: { currentRole: string; skills: string[]; tasks: string[]; interests: string[] }): string {
  // Create a deterministic cache key based on the input data
  const normalized = {
    role: (data.currentRole || "").toLowerCase().trim(),
    skills: (data.skills || []).sort().map(s => s.toLowerCase().trim()),
    tasks: (data.tasks || []).sort().map(t => t.toLowerCase().trim()),
    interests: (data.interests || []).sort().map(i => i.toLowerCase().trim()),
  };
  
  const keyString = JSON.stringify(normalized);
  // Simple hash function for shorter keys
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    const char = keyString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `paths_${Math.abs(hash).toString(36)}`;
}

export { generateCacheKey };

