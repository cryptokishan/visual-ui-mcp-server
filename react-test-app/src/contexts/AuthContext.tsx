import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { type User } from "../types";

// Simple JWT verification for browser (for token persistence)
const verifySimpleJWT = (token: string): User | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // JWT uses URL-safe base64, convert to regular base64 for atob()
    const base64Payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    // Add padding if needed
    const paddedPayload = base64Payload.padEnd(
      base64Payload.length + ((4 - (base64Payload.length % 4)) % 4),
      "="
    );

    const payload = JSON.parse(atob(paddedPayload));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Return user object from payload
    return {
      id: String(payload.id),
      username: payload.username,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      avatar: payload.avatar,
      role: payload.role,
      isActive: payload.isActive,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    };
  } catch {
    return null;
  }
};

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app load
    const checkAuthStatus = () => {
      const token = localStorage.getItem("authToken");

      if (token) {
        try {
          const decoded = verifySimpleJWT(token);
          if (decoded) {
            setUser(decoded);
          } else {
            // Token exists but is invalid, remove it
            localStorage.removeItem("authToken");
          }
        } catch {
          // Token decoding failed, remove it
          localStorage.removeItem("authToken");
        }
      }
      setIsLoading(false);
    };

    checkAuthStatus();

    // Listen for auth errors (token expiry)
    const handleAuthError = (event: CustomEvent) => {
      if (event.detail.type === "token-expired") {
        setUser(null);
        // Redirect to login if needed (handled by components)
      }
    };

    window.addEventListener("auth-error", handleAuthError as EventListener);

    return () => {
      window.removeEventListener(
        "auth-error",
        handleAuthError as EventListener
      );
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Import authApi here to avoid circular dependency issues
      const { authApi } = await import("../lib/api");
      const response = await authApi.login(email, password);

      // Store token and update user state
      localStorage.setItem("authToken", response.token);
      setUser(response.user as User);

      return true;
    } catch (error: unknown) {
      console.error("Login error:", error);
      // Clear token on login failure
      localStorage.removeItem("authToken");
      return false;
    }
  };

  const logout = () => {
    console.log("Logout called, clearing token");
    localStorage.removeItem("authToken");
    setUser(null);
    console.log("User logged out, token cleared");
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
