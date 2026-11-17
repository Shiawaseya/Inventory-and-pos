"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";
import { useViewStore } from "../store/viewStore";
import { useResetPassword } from "../hooks/useResetPassword";

const BRAND = "#3F3FF3";
const labelCls =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export default function ResetPassword() {
  const setLoginView = useViewStore((state) => state.setLoginView);
  const isResetPasswordView = useViewStore(
    (state) => state.isResetPasswordView,
  );
  const r = useResetPassword();

  if (!isResetPasswordView) return null;

  const backToLogin = () => {
    r.reset();
    setLoginView();
  };

  const titles = {
    email: [
      "Reset Password",
      "Enter your email address and we'll send you a 6-digit verification code.",
    ],
    otp: [
      "Enter Verification Code",
      `We sent a code to ${r.email}. It expires in 10 minutes.`,
    ],
    password: [
      "Create New Password",
      "Choose a strong password you haven't used before.",
    ],
    done: [
      "Password Reset",
      "Your password has been updated. You can now log in.",
    ],
  } as const;
  const [title, subtitle] = titles[r.step];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (r.step === "email") r.sendOtp();
    else if (r.step === "otp") r.verifyOtp();
    else if (r.step === "password") r.submitPassword();
  };

  const submitDisabled =
    r.isLoading ||
    (r.step === "email" && !r.email) ||
    (r.step === "otp" && r.otp.length !== 6) ||
    (r.step === "password" && (!r.newPassword || !r.confirmPassword));

  const submitLabel = r.isLoading
    ? "Please wait..."
    : {
        email: "Send Verification Code",
        otp: "Verify Code",
        password: "Reset Password",
        done: "",
      }[r.step];

  return (
    <div className="relative w-full max-w-xl mx-auto p-6 sm:p-8 bg-card border border-border/60 rounded-2xl shadow-sm">
      {r.step !== "done" && (
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            r.step === "email" ? backToLogin() : r.setStep("email")
          }
          disabled={r.isLoading}
          className="absolute left-4 top-4 p-2 hover:bg-gray-100 cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}

      <div className="space-y-6">
        <div className="space-y-1.5 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {r.error && (
          <Alert
            variant="destructive"
            className="border-destructive/30 bg-destructive/10"
          >
            <AlertDescription className="text-sm font-medium">
              {r.error}
            </AlertDescription>
          </Alert>
        )}

        {r.step === "done" ? (
          <Button
            onClick={backToLogin}
            className="w-full h-11 text-sm font-semibold text-white rounded-lg cursor-pointer"
            style={{ backgroundColor: BRAND }}
          >
            Back to Login
          </Button>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {r.step === "email" && (
              <div className="space-y-1.5">
                <Label htmlFor="email" className={labelCls}>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@company.com"
                  value={r.email}
                  onChange={(e) => r.setEmail(e.target.value)}
                  disabled={r.isLoading}
                  required
                  className="h-11 rounded-lg"
                />
              </div>
            )}

            {r.step === "otp" && (
              <div className="space-y-1.5">
                <Label htmlFor="otp" className={labelCls}>
                  Verification Code
                </Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={r.otp}
                  onChange={(e) => r.setOtp(e.target.value.replace(/\D/g, ""))}
                  disabled={r.isLoading}
                  required
                  className="h-12 rounded-lg text-center text-xl tracking-[0.5em]"
                />
                <div className="text-center text-sm text-muted-foreground pt-1">
                  Didn't get it?{" "}
                  <Button
                    type="button"
                    variant="link"
                    onClick={r.sendOtp}
                    disabled={r.isLoading || r.cooldown > 0}
                    className="p-0 h-auto text-sm font-medium cursor-pointer"
                    style={{ color: BRAND }}
                  >
                    {r.cooldown > 0
                      ? `Resend in ${r.cooldown}s`
                      : "Resend code"}
                  </Button>
                </div>
              </div>
            )}

            {r.step === "password" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className={labelCls}>
                    New Password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={r.newPassword}
                    onChange={(e) => r.setNewPassword(e.target.value)}
                    disabled={r.isLoading}
                    required
                    className="h-11 rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    8–64 characters with upper &amp; lowercase letters, a number
                    and a special character. No spaces.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className={labelCls}>
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={r.confirmPassword}
                    onChange={(e) => r.setConfirmPassword(e.target.value)}
                    disabled={r.isLoading}
                    required
                    className="h-11 rounded-lg"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={submitDisabled}
              className="w-full h-11 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND }}
            >
              {submitLabel}
            </Button>
          </form>
        )}

        {r.step !== "done" && (
          <div className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm font-medium hover:underline cursor-pointer"
              style={{ color: BRAND }}
              onClick={backToLogin}
              disabled={r.isLoading}
            >
              Back to Login.
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
