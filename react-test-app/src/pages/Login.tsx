import { useState } from "react";
import { Button, Input, Label } from "react-aria-components";
import { useNavigate } from "react-router-dom";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Mock authentication: any username with password "password"
    if (password === "password" && username.trim()) {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Set user in localStorage for demo
      localStorage.setItem(
        "user",
        JSON.stringify({ username, id: Date.now() })
      );
      navigate("/dashboard");
    } else {
      setError("Invalid username or password");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <div className="space-y-2">
                <Label className="block text-sm font-medium text-gray-700">
                  Username
                </Label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername((e.target as HTMLInputElement).value)
                  }
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <div className="space-y-2">
                <Label className="block text-sm font-medium text-gray-700">
                  Password
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword((e.target as HTMLInputElement).value)
                  }
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm font-medium" role="alert">
              {error}
            </div>
          )}

          <div>
            <Button
              type="submit"
              isDisabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Demo: Use any username with password "password"
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
