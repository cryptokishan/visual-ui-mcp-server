import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  EyeIcon,
  HandThumbUpIcon,
  ShareIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { Button } from "react-aria-components";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../lib/api";
import { type ApiResponse, type Post, type User } from "../types";

function PostsDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: postData, isLoading: postLoading } = useQuery({
    queryKey: ["posts", id],
    queryFn: () => apiClient.get(`/posts/${id}`),
  });

  const post = postData as Post;

  const { data: usersResponse } = useQuery<ApiResponse<User>>({
    queryKey: ["users"],
    queryFn: () => apiClient.get("/users"),
  });

  const users = usersResponse?.data || [];

  const getAuthor = (authorId: number) => {
    return users?.find((user: User) => user.id === authorId);
  };

  const handleBackToPosts = () => {
    navigate("/posts");
  };

  const handleAuthorClick = (authorId: string) => {
    navigate(`/users/${authorId}`);
  };

  const getRelatedPosts = () => {
    // Mock related posts logic - in a real app, this would be a more sophisticated algorithm
    return [];
  };

  if (postLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">
          Loading post...
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Post not found
          </h2>
          <Button
            onPress={handleBackToPosts}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" aria-hidden="true" /> Back
          </Button>
        </div>
      </div>
    );
  }

  const author = getAuthor(post.authorId);
  const relatedPosts = getRelatedPosts();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-800/55 opacity-95">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button
              onPress={handleBackToPosts}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              ← Back
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Post Header */}
          <div className="px-6 py-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  post.status === "published"
                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                    : post.status === "draft"
                    ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                    : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                }`}
              >
                {post.status}
              </span>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <CalendarDaysIcon className="w-4 h-4 mr-1" />
                {new Date(post.publishDate).toLocaleDateString()}
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              {post.title}
            </h1>

            {/* Author Info */}
            <div className="flex items-center space-x-4 mb-6">
              <div
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
                onClick={() =>
                  author && handleAuthorClick(author.id.toString())
                }
              >
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {author?.username?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {author?.username}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {author?.role || "Author"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="px-6 py-8">
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
            </div>
          </div>

          {/* Post Footer */}
          <div className="px-6 py-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center space-x-1">
                  <EyeIcon className="w-4 h-4" />
                  <span>{post.views} views</span>
                </span>
                <span className="flex items-center space-x-1">
                  <HandThumbUpIcon className="w-4 h-4" />
                  <span>{post.likes} likes</span>
                </span>
                <span className="flex items-center space-x-1">
                  <TagIcon className="w-4 h-4" />
                  <span>{post.tags?.join(", ")}</span>
                </span>
              </div>
              <div className="flex space-x-2">
                <Button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <HandThumbUpIcon className="w-4 h-4 mr-1" />
                  Like
                </Button>
                <Button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ShareIcon className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </article>

        {/* Related Posts Placeholder */}
        {relatedPosts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Related Posts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedPosts.map((relatedPost: Post) => (
                <div
                  key={relatedPost.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer border border-gray-200 p-6"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {relatedPost.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {relatedPost.content.substring(0, 150)}...
                  </p>
                  <div className="text-sm text-gray-500">
                    📅 {new Date(relatedPost.publishDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PostsDetail;
