import axios from "axios";

// All API calls now go through Vite proxy /api → localhost:3001
// This unifies fetch() calls and axios calls under one proxy system

// Create axios instance for all requests (data and auth)
const api = axios.create({
  baseURL: "/api", // Vite proxy transforms this to localhost:3001
  headers: {
    "Content-Type": "application/json",
  },
});

// Authentication is now handled server-side in server.js

// Request interceptor to add JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    console.log("Attaching token to request:", token ? "JWT_TOKEN_PRESENT" : null);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem("authToken");
      // Redirect to login page (this will be handled by the AuthContext)
      window.dispatchEvent(
        new CustomEvent("auth-error", { detail: { type: "token-expired" } })
      );
    }
    return Promise.reject(error);
  }
);

// User interface
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Auth API response types
export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", { email, password });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(response.data?.error || "Login failed");
    }

    return response.data;
  },

  register: async (userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post("/auth/register", userData);

    if (response.status < 200 || response.status >= 300) {
      throw new Error(response.data?.error || "Registration failed");
    }

    return response.data;
  },
};

// Generic API functions
export const apiClient = {
  get: <T>(url: string, params?: Record<string, unknown>): Promise<T> =>
    api.get(url, { params }).then((res) => res.data),
  post: <T>(url: string, data?: Record<string, unknown>): Promise<T> =>
    api.post(url, data).then((res) => res.data),
  put: <T>(url: string, data?: Record<string, unknown>): Promise<T> =>
    api.put(url, data).then((res) => res.data),
  patch: <T>(url: string, data?: Record<string, unknown>): Promise<T> =>
    api.patch(url, data).then((res) => res.data),
  delete: <T = void>(url: string): Promise<T> =>
    api.delete(url).then((res) => res.data),
};

export default api;
