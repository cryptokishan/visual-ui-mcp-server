import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "react-aria-components";
import { Link, useNavigate } from "react-router-dom";

// Mock API call function using proxy paths
const fetchData = async (endpoint: string) => {
  const response = await fetch(`/api/${endpoint}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return response.json();
};

function Dashboard() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });

  // React Query hooks for data fetching
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetchData("posts"),
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchData("products"),
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                PRAX
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/posts"
                className="text-sm text-gray-300 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Posts
              </Link>
              <Link
                to="/products"
                className="text-sm text-gray-300 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Products
              </Link>
              <Link
                to="/users"
                className="text-sm text-gray-300 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Users
              </Link>
              <Link
                to="/settings"
                className="text-sm text-gray-300 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Settings
              </Link>
              <span className="text-sm text-gray-400 dark:text-gray-300">
                Welcome, {user.username}
              </span>
              <Button
                onPress={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <Link
              to="/posts"
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-800 transition-all border border-gray-200 dark:border-gray-700"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      📝
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Posts
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {postsLoading ? "..." : posts?.length || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              to="/products"
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-green-200 dark:hover:ring-green-800 transition-all border border-gray-200 dark:border-gray-700"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      🛒
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Products
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        {productsLoading ? "..." : products?.length || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              to="/users"
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-purple-200 dark:hover:ring-purple-800 transition-all border border-gray-200 dark:border-gray-700"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      👥
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Users
                      </dt>
                      <dd className="text-lg font-medium text-gray-900 dark:text-white">
                        23
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Posts */}
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md mb-8 border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Recent Posts
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                Latest posts from the API
              </p>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {postsLoading ? (
                <li className="px-4 py-4 text-gray-500 dark:text-gray-400">
                  Loading posts...
                </li>
              ) : (
                posts?.slice(0, 5).map((post: any) => (
                  <li
                    key={post.id}
                    className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => navigate(`/posts/${post.id}`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {post.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {post.content.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          {post.status}
                        </span>
                      </div>
                    </div>
                  </li>
                )) || []
              )}
            </ul>
          </div>

          {/* Products Grid */}
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Popular Products
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                Top rated products from our catalog
              </p>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 p-4">
                {productsLoading ? (
                  <div className="col-span-full text-center py-4 text-gray-500 dark:text-gray-400">
                    Loading products...
                  </div>
                ) : (
                  products?.slice(0, 6).map((product: any) => (
                    <div
                      key={product.id}
                      className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hover:shadow-md dark:hover:bg-gray-600 cursor-pointer transition-all border border-gray-200 dark:border-gray-600"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      <div className="aspect-w-1 aspect-h-1 bg-gray-200 dark:bg-gray-600 rounded-md mb-3 overflow-hidden">
                        <img
                          src={product.images?.[0]}
                          alt={product.name}
                          className="w-full h-48 object-cover rounded-md"
                        />
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {product.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        ${product.price?.toFixed(2)}
                      </p>
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {product.category}
                        </span>
                      </div>
                    </div>
                  )) || []
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
