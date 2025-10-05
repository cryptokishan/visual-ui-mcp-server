import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "react-aria-components";
import { useNavigate } from "react-router-dom";

// Mock API call function using proxy paths
const fetchData = async (endpoint: string) => {
  const response = await fetch(`/api/${endpoint}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return response.json();
};

function PostsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetchData("posts"),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchData("users"),
  });

  const filteredPosts =
    posts?.filter(
      (post: any) =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const getAuthorName = (authorId: number) => {
    const author = users?.find((user: any) => user.id === authorId);
    return author ? author.username : "Unknown";
  };

  const handlePostClick = (postId: string) => {
    navigate(`/posts/${postId}`);
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                onPress={handleBackToDashboard}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
              >
                ← Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Posts
              </h1>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                🔍
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600 dark:text-gray-400">
              Loading posts...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post: any) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md dark:hover:bg-gray-750 transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-700"
                onClick={() => handlePostClick(post.id.toString())}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        post.status === "published"
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : post.status === "draft"
                          ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                          : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                      }`}
                    >
                      {post.status}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      By {getAuthorName(post.authorId)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                    {post.content}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-4">
                      <span>👁 {post.views}</span>
                      <span>👍 {post.likes}</span>
                    </div>
                    <span>
                      📅 {new Date(post.publishDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default PostsList;
