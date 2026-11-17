"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useViewStore } from "../store/viewStore";
import useRegistration from "../hooks/useRegistration";
import { useRoles } from "../queries/useRoles";
import { PASSWORD_PATTERN, PASSWORD_RULES } from "@/lib/passwordPolicy";
import { Check, Circle } from "lucide-react";

export default function Signup() {
  const setLoginView = useViewStore((state) => state.setLoginView);
  const isSignupView = useViewStore((state) => state.isSignupView);
  const { roles, isLoading: rolesLoading, isError: rolesError } = useRoles();
  const {
    firstName,
    setFirstName,
    middleName,
    setMiddleName,
    lastName,
    setLastName,
    username,
    setUsername,
    email,
    setEmail,
    contactNumber,
    setContactNumber,
    pin,
    setPin,
    branchId,
    setBranchId,
    roleId,
    setRoleId,
    handleSubmit,
    error,
    successMessage,
    isLoading,
  } = useRegistration();

  // Keep branch locked to 1 in the background
  useEffect(() => {
    if (branchId !== 1 && branchId !== "1") {
      setBranchId(1);
    }
  }, [branchId, setBranchId]);

  if (!isSignupView) return null;

  return (
    <div className="w-full max-w-xl mx-auto p-6 sm:p-8 bg-card border border-border/60 rounded-2xl shadow-sm">
      <div className="space-y-6">
        {/* Title & Subtitle */}
        <div className="space-y-1.5 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Create Account
          </h2>
          <p className="text-sm text-muted-foreground">
            Submit your team account credentials for administrator approval.
          </p>
        </div>

        {/* Alerts */}
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
        {successMessage && (
          <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <AlertDescription className="text-sm font-medium">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hidden Branch ID locked to 1 */}
          <input type="hidden" name="branchId" value={branchId || 1} />

          {/* Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="firstName"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder="John"
                className="h-11 rounded-lg"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="middleName"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Middle Name
              </Label>
              <Input
                id="middleName"
                placeholder="M."
                className="h-11 rounded-lg"
                value={middleName}
                onChange={(event) => setMiddleName(event.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="lastName"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                placeholder="Doe"
                className="h-11 rounded-lg"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Account Credentials Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                placeholder="johndoe"
                className="h-11 rounded-lg"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="john@example.com"
                className="h-11 rounded-lg"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Contact & Role Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="contactNumber"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Contact Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contactNumber"
                type="tel"
                inputMode="tel"
                placeholder="09171234567"
                pattern="^\+?[0-9\s\-]{7,20}$"
                title="Enter a valid phone number, e.g. 09171234567"
                className="h-11 rounded-lg"
                value={contactNumber}
                onChange={(event) => setContactNumber(event.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="role"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Role Assignment <span className="text-destructive">*</span>
              </Label>
              <Select
                value={roleId}
                onValueChange={setRoleId}
                disabled={isLoading || rolesLoading || rolesError}
              >
                <SelectTrigger id="role" className="h-11 w-full rounded-lg">
                  <SelectValue
                    placeholder={
                      rolesLoading ? "Loading roles..." : "Select a role"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem
                      key={String(role.id ?? role.key)}
                      value={String(role.id)}
                    >
                      {role.displayName || role.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rolesError && (
                <p className="text-xs text-destructive">
                  Unable to load system roles.
                </p>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <Label
              htmlFor="pin"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pin"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••••"
              pattern={PASSWORD_PATTERN}
              title="8-64 characters with uppercase, lowercase, a number and a special character. No spaces."
              maxLength={64}
              className="h-11 rounded-lg"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Password Validation Criteria Checklist */}
          {pin.length > 0 && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(pin);
                  return (
                    <li
                      key={rule.id}
                      className={`flex items-center gap-1.5 transition-colors ${
                        passed
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {passed ? (
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      ) : (
                        <Circle className="h-2.5 w-2.5 opacity-40 fill-current" />
                      )}
                      <span>{rule.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || rolesLoading || rolesError || !roles.length}
            className="w-full h-11 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-95 transition-all mt-2 cursor-pointer"
            style={{ backgroundColor: "#3F3FF3" }}
          >
            {isLoading ? "Submitting Application..." : "Create Account"}
          </Button>
        </form>

        {/* Footer Navigation */}
        <div className="pt-2 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-sm font-medium hover:underline cursor-pointer"
            style={{ color: "#3F3FF3" }}
            onClick={() => setLoginView()}
            disabled={isLoading}
          >
            Sign In.
          </Button>
        </div>
      </div>
    </div>
  );
}
