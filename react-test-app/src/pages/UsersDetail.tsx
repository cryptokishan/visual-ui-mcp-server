import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  EyeIcon,
  HandThumbUpIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { Button } from "react-aria-components";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../lib/api";

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  status: string;
  publishDate: string;
  views: number;
  likes: number;
  authorId: number;
  tags?: string[];
}

function UsersDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["users", id],
    queryFn: () => apiClient.get<User>(`/users/${id}`),
  });

  const { data: postsResponse } = useQuery({
    queryKey: ["posts"],
    queryFn: () => apiClient.get(`/posts`),
  });

  const posts = Array.isArray(postsResponse)
    ? postsResponse
    : postsResponse?.data || [];

  const user = userData;

  const handleBackToUsers = () => {
    navigate("/users");
  };

  const handlePostClick = (postId: string) => {
    navigate(`/posts/${postId}`);
  };

  const userPosts =
    posts?.filter((post: Post) => post.authorId.toString() === id) || [];

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "moderator":
        return "bg-blue-100 text-blue-800";
      case "user":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">
          Loading user...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            User not found
          </h2>
          <Button
            onPress={handleBackToUsers}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" aria-hidden="true" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-800/55 opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button
              onPress={handleBackToUsers}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              ← Back
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1">
            {/* User Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="text-center mb-6">
                <img
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
                />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  @{user.username}
                </p>
                <div className="flex justify-center space-x-2 mb-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(
                      user.role
                    )} dark:bg-gray-500 dark:text-gray-100`}
                  >
                    {user.role}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      user.isActive
                    )} dark:bg-gray-500 dark:text-gray-100`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* User Stats */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Statistics
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">
                      Total Posts:
                    </dt>
                    <dd className="text-sm font-semibold text-gray-900 dark:text-white">
                      {userPosts.length}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">
                      Member Since:
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600 dark:text-gray-400">
                      Last Updated:
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white">
                      {new Date(user.updatedAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Contact Information
              </h3>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Email
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {user.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Username
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    @{user.username}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* User Posts */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Recent Posts ({userPosts.length})
                </h2>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {userPosts.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No posts yet
                  </div>
                ) : (
                  userPosts.slice(0, 10).map((post: Post) => (
                    <div
                      key={post.id}
                      className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => handlePostClick(post.id.toString())}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                          {post.title}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            post.status === "published"
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                              : post.status === "draft"
                              ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                              : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                        {post.content}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <CalendarDaysIcon className="w-4 h-4" />
                            <span>
                              {new Date(post.publishDate).toLocaleDateString()}
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <EyeIcon className="w-4 h-4" />
                            <span>{post.views}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <HandThumbUpIcon className="w-4 h-4" />
                            <span>{post.likes}</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {post.tags?.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UsersDetail;
