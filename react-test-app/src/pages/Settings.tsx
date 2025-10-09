import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import {
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from "react-aria-components";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [settings, setSettings] = useState({
    notifications: true,
    language: "en",
  });

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportData = () => {
    // Mock data export functionality
    const exportData = {
      user: user,
      timestamp: new Date().toISOString(),
      message: "Data export completed successfully",
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "user-data-export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gray-50 dark:bg-gray-800/55 opacity-95">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                onPress={handleBackToDashboard}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
            </div>
            <Button
              onPress={logout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto sm:px-6 lg:px-8 my-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Account Information - Centered, No Background */}
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              {/* User Avatar - Centered */}
              <div className="flex justify-center mb-4">
                <img
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="h-24 w-24 rounded-full object-cover border-4 border-white dark:border-gray-600 shadow-lg"
                />
              </div>

              {/* User Details - Stacked Vertically */}
              <div className="space-y-2">
                {/* Full Name */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.firstName} {user.lastName}
                </h2>

                {/* Username */}
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  @{user.username}
                </p>

                {/* Email */}
                <p className="text-base text-gray-600 dark:text-gray-400">
                  {user.email}
                </p>

                {/* Role & Status */}
                <div className="inline-flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                    {user.role}
                  </span>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      user.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Account Settings
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage your account preferences and settings.
            </p>
          </div>

          <div className="px-6 py-6 space-y-8">
            {/* Theme Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Appearance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="dark-mode"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Dark Mode:{" "}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          theme === "dark"
                            ? "bg-gray-900 text-gray-100 dark:bg-gray-700 dark:text-gray-200"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        {theme === "dark" ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Toggle between light and dark themes for better visibility
                      in different lighting conditions
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="dark-mode"
                      className="sr-only peer"
                      checked={theme === "dark"}
                      onChange={toggleTheme}
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-400 dark:peer-focus:ring-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600 dark:peer-checked:bg-slate-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="language"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Language
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Select your preferred language
                    </p>
                  </div>
                  <Select
                    selectedKey={settings.language}
                    onSelectionChange={(key) => {
                      const newValue = key ? String(key) : "en";
                      handleSettingChange("language", newValue);
                    }}
                  >
                    <Button className="mt-1 flex px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500 w-48">
                      <SelectValue />
                      <ChevronDownIcon className="ml-auto h-5 w-5" />
                    </Button>
                    <Popover>
                      <ListBox className="p-2 space-y-2 max-h-60 overflow-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                        <ListBoxItem
                          className="px-3 py-2 rounded-md text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none disabled:opacity-50"
                          id="en"
                          key="en"
                        >
                          English
                        </ListBoxItem>
                        <ListBoxItem
                          className="px-3 py-2 rounded-md text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none disabled:opacity-50"
                          id="es"
                          key="es"
                        >
                          Español
                        </ListBoxItem>
                        <ListBoxItem
                          className="px-3 py-2 rounded-md text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none disabled:opacity-50"
                          id="fr"
                          key="fr"
                        >
                          Français
                        </ListBoxItem>
                        <ListBoxItem
                          className="px-3 py-2 rounded-md text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none disabled:opacity-50"
                          id="de"
                          key="de"
                        >
                          Deutsch
                        </ListBoxItem>
                      </ListBox>
                    </Popover>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Notifications
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="notifications"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Push Notifications
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive notifications about updates and activities
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="notifications"
                      className="sr-only peer"
                      checked={settings.notifications}
                      onChange={(e) =>
                        handleSettingChange("notifications", e.target.checked)
                      }
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-400 dark:peer-focus:ring-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600 dark:peer-checked:bg-slate-500"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Data Management
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Export Your Data
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Download a copy of your account data
                    </p>
                  </div>
                  <Button
                    onPress={handleExportData}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <div className="flex justify-start items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Changes are saved automatically
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Settings;
