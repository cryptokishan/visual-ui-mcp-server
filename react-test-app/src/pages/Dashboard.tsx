import { StarIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  PostsActivityChart,
  ProductsRevenueChart,
  UsersGrowthChart,
} from "../components/DashboardCharts";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../lib/api";
import {
  type ApiResponse,
  type PopularProductsProps,
  type Post,
  type Product,
  type RecentPostsProps,
} from "../types";

// Popular Products Component

function PopularProductsSection({
  products,
  productsLoading,
  navigate,
}: PopularProductsProps) {
  return (
    <div className="flex-1 bg-white dark:bg-gray-800 shadow overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Popular Products
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Top rated products from our catalog
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48 mb-3"></div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 mb-2"></div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded h-3 w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {products?.slice(0, 4).map((product: Product) => {
              return (
                <div
                  key={product.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md dark:hover:bg-gray-750 transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700 overflow-hidden group"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <div
                    className="relative w-full bg-gray-100 dark:bg-gray-700 overflow-hidden rounded-lg"
                    style={{ aspectRatio: "0.83/1" }}
                  >
                    <img
                      src={product.images?.[0]}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/95 via-black/80 via-black/60 to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                        <h3 className="text-white font-bold text-lg leading-tight line-clamp-1">
                          {product.name}
                        </h3>
                        <p className="text-white/90 text-sm leading-tight line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-white font-bold text-xl">
                            ${product.price?.toFixed(2)}
                          </div>
                          <div className="text-white/80 text-sm flex items-center">
                            <StarIcon className="h-3 w-3 mr-1" />
                            {product.rating?.toFixed(1) || "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 left-2 z-10">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
                        {product.category}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RecentPostsSection({
  posts,
  postsLoading,
  navigate,
}: RecentPostsProps) {
  return (
    <div className="w-full lg:w-2/5 bg-white dark:bg-gray-800 shadow overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Posts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Latest posts from the platform
            </p>
          </div>
        </div>
      </div>

      {postsLoading ? (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-200 dark:bg-gray-600 rounded h-4 mb-2"></div>
                  <div className="bg-gray-200 dark:bg-gray-600 rounded h-3 w-3/4"></div>
                </div>
                <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-6 w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {posts?.slice(0, 5).map((post: Post) => (
            <li
              key={post.id}
              className="px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 group"
              onClick={() => navigate(`/posts/${post.id}`)}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:bg-blue-600 transition-colors"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {post.title}
                      </p>
                      <p
                        className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {post.content}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center space-x-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {post.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      • 2 hours ago
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </li>
          )) || []}
        </ul>
      )}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: postsResponse, isLoading: postsLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: () => apiClient.get<ApiResponse<Post>>("/posts"),
  });

  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiClient.get<ApiResponse<Product>>("/products"),
  });

  const posts = Array.isArray(postsResponse)
    ? postsResponse
    : postsResponse?.data || [];
  const products = Array.isArray(productsResponse)
    ? productsResponse
    : productsResponse?.data || [];

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Chart Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <Link
              to="/products"
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-green-200 dark:hover:ring-green-800 transition-all border border-gray-200 dark:border-gray-700"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Product Categories
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      By popularity
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {productsLoading ? "..." : products?.length || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      total products
                    </div>
                  </div>
                </div>
                <div className="h-16 w-full">
                  <ProductsRevenueChart products={products} />
                </div>
              </div>
            </Link>
            <Link
              to="/posts"
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-800 transition-all border border-gray-200 dark:border-gray-700"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Post Activity
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Trending upward
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {postsLoading ? "..." : posts?.length || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      posts this month
                    </div>
                  </div>
                </div>
                <div className="h-16 w-full">
                  <PostsActivityChart />
                </div>
              </div>
            </Link>

            <Link
              to="/users"
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-purple-200 dark:hover:ring-purple-800 transition-all border border-gray-200 dark:border-gray-700"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      User Growth
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Steady increase
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      23
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      active users
                    </div>
                  </div>
                </div>
                <div className="h-16 w-full">
                  <UsersGrowthChart />
                </div>
              </div>
            </Link>
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col lg:flex-row gap-8">
            <PopularProductsSection
              products={products}
              productsLoading={productsLoading}
              navigate={navigate}
            />

            <RecentPostsSection
              posts={posts}
              postsLoading={postsLoading}
              navigate={navigate}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
