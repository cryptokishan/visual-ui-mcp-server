// Common type definitions for the React app
import type { ReactNode } from "react";

export type Theme = "light" | "dark";

export interface User {
  id: string | number;
  username?: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  status: string;
  author?: User;
  authorId?: number;
  publishDate?: string;
  views?: number;
  likes?: number;
  createdAt?: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  category: string;
  images?: string[];
  rating?: number;
  tags?: string[];
  stock?: number;
}

export interface ApiResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Component Props
export interface NavigationProps {
  user?: User;
}



export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export interface ThemeProviderProps {
  children: ReactNode;
}

export interface PopularProductsProps {
  products: Product[];
  productsLoading: boolean;
  navigate: (path: string) => void;
}

export interface RecentPostsProps {
  posts: Post[];
  postsLoading: boolean;
  navigate: (path: string) => void;
}

export interface ProtectedRouteProps {
  children: ReactNode;
}
