import { 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from "firebase/auth";
import { getAuthInstance } from "./firebase";

export async function signInAnonymouslyUser() {
  try {
    const auth = getAuthInstance();
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    throw error;
  }
}

export async function signOutUser() {
  try {
    const auth = getAuthInstance();
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

export function getCurrentUser(): FirebaseUser | null {
  const auth = getAuthInstance();
  return auth.currentUser;
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  const auth = getAuthInstance();
  return onAuthStateChanged(auth, callback);
}

