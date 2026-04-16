import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
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

function getRoleRedirect(role: string | undefined): string | null {
  switch (role) {
    case "superadmin":
      return "/superadmin";
    case "admin":
      return "/admin";
    case "area-manager":
      return "/area-manager";
    case "api-user":
      return "/api-docs";
    case "user":
      return "/apply-permit";
    default:
      return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Track whether the user was previously signed out so we only redirect on fresh sign-in
  const wasSignedOut = useRef(true);

  useEffect(() => {
    const fetchUserProfile = async (u: User) => {
      try {
        const profile = await getUserProfile(u.uid);
        setUserProfile(profile);

        // Redirect on fresh sign-in (not page reload) and only from the home page
        if (wasSignedOut.current && profile && window.location.pathname === "/") {
          const target = getRoleRedirect(profile.role);
          if (target) {
            // Small delay so the auth state settles and the toast is visible
            setTimeout(() => {
              window.location.href = target;
            }, 300);
          }
        }
        wasSignedOut.current = false;
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
        wasSignedOut.current = true;
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
