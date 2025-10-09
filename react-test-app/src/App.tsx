import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useNavigate,
} from "react-router-dom";
import Footer from "./components/Footer";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import PostsDetail from "./pages/PostsDetail";
import PostsList from "./pages/PostsList";
import ProductsDetail from "./pages/ProductsDetail";
import ProductsList from "./pages/ProductsList";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import UsersDetail from "./pages/UsersDetail";
import UsersList from "./pages/UsersList";

// Create a client
const queryClient = new QueryClient();

// Protected Layout component that includes navigation
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

// Component to handle auth error redirects
function AuthErrorHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      if (event.detail.type === "token-expired") {
        // Clear local storage and redirect to login
        localStorage.removeItem("authToken");
        // Only redirect if not already on login page
        if (window.location.pathname !== "/login") {
          navigate("/login", { replace: true });
        }
      }
    };

    window.addEventListener("auth-error", handleAuthError as EventListener);

    return () => {
      window.removeEventListener(
        "auth-error",
        handleAuthError as EventListener
      );
    };
  }, [navigate]);

  return null;
}

// Removed AuthStateHandler - AuthContext handles all token management

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AuthErrorHandler />
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <Dashboard />
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/posts"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <PostsList />
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/posts/:id"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <PostsDetail />
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <ProductsList />
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products/:id"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <ProductsDetail />
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <UsersList />
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/:id"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <UsersDetail />
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <Settings />
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
