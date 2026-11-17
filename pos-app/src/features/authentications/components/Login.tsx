"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff } from "lucide-react";
import { useViewStore } from "../store/viewStore";
import { useLogin } from "../hooks/useLogin";

export default function Login() {
  const isLoginView = useViewStore((state) => state.isLoginView);
  const setSignupView = useViewStore((state) => state.setSignupView);
  const setResetPasswordView = useViewStore(
    (state) => state.setResetPasswordView,
  );

  const {
    username,
    setUsername,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,
    handleSubmit,
    isLoading,
    error,
  } = useLogin((data) => {
    console.log("Login successful:", data);
  });

  if (!isLoginView) return null;

  return (
    <div className="w-full max-w-xl mx-auto p-6 sm:p-8 bg-card border border-border/60 rounded-2xl shadow-sm">
      <div className="space-y-6">
        {/* Mobile Header / Branding */}
        <div className="lg:hidden text-center mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
            style={{ backgroundColor: "#3F3FF3" }}
          >
            <div className="w-3.5 h-3.5 bg-white rounded-sm" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            StockPilot IMS
          </h1>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1.5 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Welcome Back
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your POS dashboard.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            variant="destructive"
            className="border-destructive/30 bg-destructive/10"
          >
            <AlertDescription className="text-sm font-medium">
              {error.message}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          <div className="space-y-1.5">
            <Label
              htmlFor="username"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
              className="h-11 rounded-lg"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="h-11 pr-10 rounded-lg"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-1">
            <label
              htmlFor="remember"
              className="flex items-center space-x-2 text-sm text-muted-foreground cursor-pointer select-none"
            >
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="rounded border-border text-[#3F3FF3] focus:ring-[#3F3FF3]/20 cursor-pointer"
              />
              <span>Remember Me</span>
            </label>

            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm font-medium hover:underline cursor-pointer"
              style={{ color: "#3F3FF3" }}
              onClick={() => setResetPasswordView()}
              disabled={isLoading}
            >
              Forgot Password?
            </Button>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full h-11 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-95 transition-all mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#3F3FF3" }}
          >
            {isLoading ? "Logging In..." : "Log In"}
          </Button>
        </form>

        {/* Footer Navigation */}
        <div className="pt-2 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-sm font-medium hover:underline cursor-pointer"
            style={{ color: "#3F3FF3" }}
            onClick={() => setSignupView()}
            disabled={isLoading}
          >
            Register Now.
          </Button>
        </div>
      </div>
    </div>
  );
}
