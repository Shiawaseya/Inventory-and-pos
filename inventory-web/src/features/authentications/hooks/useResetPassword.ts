// features/authentications/hooks/useResetPassword.ts
import { useEffect, useState } from "react";
import { passwordResetApi, ApiError } from "../api/passwordResetApi";

export type ResetStep = "email" | "otp" | "password" | "done";

export function useResetPassword() {
  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const run = async (fn: () => Promise<void>) => {
    setIsLoading(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiError && e.retryAfter) setCooldown(e.retryAfter);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = () =>
    run(async () => {
      const res = await passwordResetApi.requestOtp(email.trim());
      setCooldown(res.resend_in ?? 60);
      setOtp("");
      setStep("otp");
    });

  const verifyOtp = () =>
    run(async () => {
      const res = await passwordResetApi.verifyOtp(email.trim(), otp);
      setResetToken(res.reset_token ?? "");
      setStep("password");
    });

  const submitPassword = () =>
    run(async () => {
      await passwordResetApi.reset({
        email: email.trim(),
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setStep("done");
    });

  const reset = () => {
    setStep("email");
    setEmail("");
    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setCooldown(0);
  };

  return {
    step,
    setStep,
    email,
    setEmail,
    otp,
    setOtp,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    error,
    cooldown,
    sendOtp,
    verifyOtp,
    submitPassword,
    reset,
  };
}
