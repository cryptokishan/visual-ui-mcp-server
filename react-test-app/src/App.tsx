import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import PostsList from "./pages/PostsList";
import PostsDetail from "./pages/PostsDetail";
import ProductsList from "./pages/ProductsList";
import ProductsDetail from "./pages/ProductsDetail";
import UsersList from "./pages/UsersList";
import UsersDetail from "./pages/UsersDetail";
import Settings from "./pages/Settings";

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/posts" element={<PostsList />} />
            <Route path="/posts/:id" element={<PostsDetail />} />
            <Route path="/products" element={<ProductsList />} />
            <Route path="/products/:id" element={<ProductsDetail />} />
            <Route path="/users" element={<UsersList />} />
            <Route path="/users/:id" element={<UsersDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
