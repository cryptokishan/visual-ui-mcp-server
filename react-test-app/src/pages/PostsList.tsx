import {
  CalendarDaysIcon,
  EyeIcon,
  HandThumbUpIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SearchField } from "react-aria-components";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../lib/api";
import { type Post, type User } from "../types";

function PostsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: postsResponse, isLoading } = useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: () => apiClient.get("/posts"),
  });

  const { data: usersResponse } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiClient.get("/users"),
  });

  const posts = postsResponse || [];
  const users = usersResponse || [];

  const filteredPosts =
    posts?.filter(
      (post: Post) =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const getAuthorName = (authorId?: number) => {
    const author = users?.find((user: User) => user.id == authorId);
    return author ? author.username || "Unknown" : "Unknown";
  };

  const handlePostClick = (postId: string) => {
    navigate(`/posts/${postId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-800/55 opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Posts
              </h1>
            </div>
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              className="w-64 relative"
            >
              <input
                type="search"
                placeholder="Search posts..."
                className="w-64 pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <MagnifyingGlassIcon className="h-5 w-5" />
              </div>
            </SearchField>
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
            {filteredPosts.map((post: Post) => (
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
                      <span className="flex items-center">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        {post.views!}
                      </span>
                      <span className="flex items-center">
                        <HandThumbUpIcon className="h-4 w-4 mr-1" />
                        {post.likes!}
                      </span>
                    </div>
                    <span className="flex items-center">
                      <CalendarDaysIcon className="h-4 w-4 mr-1" />
                      {new Date(post.publishDate!).toLocaleDateString()}
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
