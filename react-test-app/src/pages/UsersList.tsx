import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  SearchField,
  Select,
  SelectValue,
} from "react-aria-components";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../lib/api";
import { type User } from "../types";

function UsersList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const { data: usersResponse, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiClient.get("/users"),
  });

  const users = usersResponse || [];

  const roles = [...new Set(users?.map((user: User) => user.role))]
    .filter(Boolean)
    .map((role) => role as string);

  const filteredUsers =
    users?.filter((user: User) => {
      const matchesSearch =
        (user.username?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        (user.firstName?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        (user.lastName?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !selectedRole || user.role === selectedRole;
      return matchesSearch && matchesRole;
    }) || [];

  const handleUserClick = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "moderator":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "user":
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-800/55 opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Users
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Role Filter */}
              <Select
                selectedKey={selectedRole}
                onSelectionChange={(key) => {
                  const newValue = key ? String(key) : "";
                  if (newValue === "" || roles.includes(newValue)) {
                    setSelectedRole(newValue);
                  }
                }}
              >
                <Button className="flex px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500">
                  <SelectValue />
                  <ChevronDownIcon className="ml-2 h-5 w-5" />
                </Button>
                <Popover>
                  <ListBox
                    className={
                      "p-2 space-y-2 max-h-60 min-w-[200px] overflow-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg"
                    }
                  >
                    <ListBoxItem
                      className="px-3 py-2 rounded-md text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                      id="all"
                      key="all"
                    >
                      All Roles
                    </ListBoxItem>
                    {roles.map((role) => (
                      <ListBoxItem
                        className="px-3 py-2 rounded-md text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                        id={role}
                        key={role}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </Select>
              {/* Search */}
              <SearchField
                value={searchTerm}
                onChange={setSearchTerm}
                className="w-64 relative"
              >
                <input
                  type="search"
                  placeholder="Search users..."
                  className="w-64 pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </div>
              </SearchField>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600 dark:text-gray-400">
              Loading users...
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    User
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user: User) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleUserClick(user.id.toString())}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            src={user.avatar || ""}
                            alt={`${user.firstName || ""} ${
                              user.lastName || ""
                            }`}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.firstName || ""} {user.lastName || ""}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            @{user.username || ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(
                          user.role
                        )} dark:bg-gray-500 dark:text-gray-100`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          user.isActive ?? true
                        )} dark:bg-gray-500 dark:text-gray-100`}
                      >
                        {user.isActive ?? true ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(
                        user.createdAt || new Date()
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default UsersList;
