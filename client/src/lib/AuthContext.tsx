import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { onAuthStateChange, getUserProfile, UserProfile } from "./firebase";

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAreaManager: boolean;
  isApiUser: boolean;
  hasManagerAccess: boolean;
  canManageBilling: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async (u: User) => {
      try {
        const profile = await getUserProfile(u.uid);
        setUserProfile(profile);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChange((u) => {
      setUser(u);
      if (u) {
        fetchUserProfile(u);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isSuperAdmin = userProfile?.role === "superadmin";
  const isAdmin = userProfile?.role === "admin" || isSuperAdmin;
  const isAreaManager = userProfile?.role === "area-manager";
  const isApiUser = userProfile?.role === "api-user";
  const hasManagerAccess = isAdmin || isAreaManager;
  const canManageBilling = isSuperAdmin || (userProfile?.canManageBilling ?? false);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAdmin,
        isSuperAdmin,
        isAreaManager,
        isApiUser,
        hasManagerAccess,
        canManageBilling,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
