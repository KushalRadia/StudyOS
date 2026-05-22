import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase/config";
export { auth, db };

export interface UserProfile {
  name: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt?: any;
  toolUsage: Record<string, number>;
  isPro?: boolean;
  googleCalendarSynced?: boolean;
  theme?: "light" | "dark";
  preferredLanguage?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginDev: () => void;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  theme: string;
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("studyos_theme") || "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("studyos_theme", theme);
  }, [theme]);

  useEffect(() => {
    const devUid = localStorage.getItem("studyos_dev_uid");
    if (devUid === "dev-user-123") {
      setUser({
        uid: "dev-user-123",
        displayName: "Dev Scholar",
        email: "dev@studyos.com",
        photoURL: null,
      } as any);
      setProfile({
        name: "Dev Scholar",
        email: "dev@studyos.com",
        photoURL: null,
        toolUsage: {},
        isPro: false,
        googleCalendarSynced: false,
        theme: "light",
        preferredLanguage: "en",
      });
      setTheme("light");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Ensure user exists in Firestore
          const userRef = doc(db, "users", currentUser.uid);
          
          // Use a 5-second timeout to prevent hanging indefinitely on slow network / offline
          const getDocWithTimeout = Promise.race([
            getDoc(userRef),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Firestore fetch timeout")), 5000)
            )
          ]);

          const userSnap = await getDocWithTimeout;
          let profileData: UserProfile;

          if (!userSnap.exists()) {
            profileData = {
              name: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              createdAt: serverTimestamp(),
              toolUsage: {},
              isPro: false,
              googleCalendarSynced: false,
              theme: "light",
              preferredLanguage: "en",
            };
            await setDoc(userRef, profileData);
          } else {
            profileData = userSnap.data() as UserProfile;
            // Sync missing fields
            let needsUpdate = false;
            const updates: any = {};
            if (profileData.isPro === undefined) {
              updates.isPro = false;
              profileData.isPro = false;
              needsUpdate = true;
            }
            if (profileData.googleCalendarSynced === undefined) {
              updates.googleCalendarSynced = false;
              profileData.googleCalendarSynced = false;
              needsUpdate = true;
            }
            if (profileData.theme === undefined) {
              updates.theme = "light";
              profileData.theme = "light";
              needsUpdate = true;
            }
            if (profileData.preferredLanguage === undefined) {
              updates.preferredLanguage = "en";
              profileData.preferredLanguage = "en";
              needsUpdate = true;
            }
            if (needsUpdate) {
              await updateDoc(userRef, updates);
            }
          }
          setProfile(profileData);
          if (profileData.theme) {
            setTheme(profileData.theme);
          }
          setUser(currentUser);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("Error during authentication sync:", error);
        // Fallback: clear user/profile on failure to prevent infinite loading
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // Navigation happens via onAuthStateChanged → ProtectedRoute
    } catch (error: any) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const loginDev = () => {
    if (import.meta.env.DEV) {
      localStorage.setItem("studyos_dev_uid", "dev-user-123");
      setUser({
        uid: "dev-user-123",
        displayName: "Dev Scholar",
        email: "dev@studyos.com",
        photoURL: null,
      } as any);
      setProfile({
        name: "Dev Scholar",
        email: "dev@studyos.com",
        photoURL: null,
        toolUsage: {},
        isPro: false,
        googleCalendarSynced: false,
        theme: "light",
        preferredLanguage: "en",
      });
      setTheme("light");
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem("studyos_dev_uid");
      setUser(null);
      setProfile(null);
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    if (user.uid === "dev-user-123") {
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
      if (updates.theme) setTheme(updates.theme);
      return;
    }
    const userRef = doc(db, "users", user.uid);
    try {
      await updateDoc(userRef, updates);
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
      if (updates.theme) setTheme(updates.theme);
    } catch (error) {
      console.error("Failed to update profile:", error);
      throw error;
    }
  };

  const toggleTheme = async () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (user) {
      try {
        await updateProfile({ theme: nextTheme });
      } catch (e) {
        console.error("Failed to save theme in Firestore:", e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        loginDev,
        logout,
        updateProfile,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
