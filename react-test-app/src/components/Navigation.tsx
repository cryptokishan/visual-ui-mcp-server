import { Link, useLocation } from "react-router-dom";

interface NavigationProps {
  user: {
    name?: string;
    email?: string;
    username?: string;
    avatar?: string;
  } | null;
}

function Navigation({ user }: NavigationProps) {
  const location = useLocation();

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      current: location.pathname === "/dashboard",
    },

    {
      name: "Products",
      href: "/products",
      current: location.pathname.startsWith("/products"),
    },
    {
      name: "Posts",
      href: "/posts",
      current: location.pathname.startsWith("/posts"),
    },
    {
      name: "Users",
      href: "/users",
      current: location.pathname.startsWith("/users"),
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side: Logo + Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link
                to="/dashboard"
                className="text-2xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                PRAX
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side: User Avatar */}
          <div className="flex items-center space-x-4">
            {user && (
              <Link to="/settings">
                <img
                  src={user?.avatar}
                  alt={`${user?.name || user?.username || "User"}`}
                  className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-1 px-2 py-2 overflow-x-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center px-3 py-2 text-xs font-medium rounded-md transition-colors min-w-fit ${
                  item.current
                    ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Navigation;
