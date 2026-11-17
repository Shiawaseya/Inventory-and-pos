import { useState } from "react";
import { loginApi } from "@/features/authentications/api/loginApi";
import { profileApi } from "../api/profileApi";
import { PhilippineAddressSelector } from "../components/PhilippineAddressSelector";
import type {
  ActionType,
  EmployeeAddress,
  EmployeeProfile,
} from "../types/profile";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Building2,
  KeyRound,
  Edit2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  PASSWORD_MAX,
  PASSWORD_RULES,
  getEmailError,
  getPasswordError,
  getPhoneError,
} from "@/lib/passwordPolicy";

const emptyAddress: EmployeeAddress = {
  street_address: "",
  barangay: "",
  city_municipality: "",
  province: "",
  region: "",
  postal_code: "",
  psgc_code: "",
};

export default function ProfilePage() {
  const user = (loginApi.getUser() as unknown as EmployeeProfile) || {};

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<"input" | "otp">("input");
  const [actionType, setActionType] = useState<ActionType>("email_update");
  const [isLoading, setIsLoading] = useState(false);

  // Form values
  const [inputValue, setInputValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [addressForm, setAddressForm] = useState<EmployeeAddress>(emptyAddress);

  const openUpdateModal = (type: ActionType) => {
    setActionType(type);
    setStep("input");
    setInputValue("");
    setCurrentPassword("");
    setConfirmPassword("");
    setOtpCode("");

    if (type === "address_update") {
      setAddressForm({
        street_address: user.address?.street_address || "",
        barangay: user.address?.barangay || "",
        city_municipality: user.address?.city_municipality || "",
        province: user.address?.province || "",
        region: user.address?.region || "",
        postal_code: user.address?.postal_code || "",
        psgc_code: user.address?.psgc_code || "",
      });
    }

    setDialogOpen(true);
  };

  /** Client-side checks; the server re-validates everything. */
  const validateInput = (): string | null => {
    if (actionType === "email_update") {
      return getEmailError(inputValue);
    }
    if (actionType === "phone_update") {
      return getPhoneError(inputValue);
    }
    if (actionType === "pin_reset") {
      if (!currentPassword) return "Current password is required.";
      const policyError = getPasswordError(inputValue);
      if (policyError) return policyError;
      if (inputValue === currentPassword)
        return "New password must be different from your current password.";
      if (inputValue !== confirmPassword)
        return "New password and confirm password do not match.";
    }
    return null;
  };

  const handleSendOtp = async () => {
    const validationError = validateInput();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsLoading(true);
    try {
      if (actionType === "pin_reset") {
        await profileApi.requestOtp({
          action_type: actionType,
          current_password: currentPassword,
          new_value: inputValue,
          confirm_password: confirmPassword,
        });
      } else {
        await profileApi.requestOtp({
          action_type: actionType,
          new_value: actionType === "address_update" ? addressForm : inputValue,
        });
      }

      toast.success("Verification code sent to your registered email.");
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Failed to request OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP code.");
      return;
    }

    setIsLoading(true);
    try {
      await profileApi.verifyOtp({
        action_type: actionType,
        otp: otpCode,
      });

      toast.success(
        "Account updated successfully! Please re-login to refresh your profile details.",
      );
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (addr?: EmployeeAddress | null) => {
    if (!addr) return "No address registered";
    return (
      [
        addr.street_address,
        addr.barangay,
        addr.city_municipality,
        addr.province,
        addr.region,
        addr.postal_code,
      ]
        .filter(Boolean)
        .join(", ") || "No address registered"
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your registered employee credentials and request verified
          updates.
        </p>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl">
          {user.name
            ? user.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase()
            : "U"}
        </div>
        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-2xl font-bold">
              {user.name || user.username || "Staff Member"}
            </h2>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground w-fit mx-auto sm:mx-0">
              {user.role || "Employee"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Username: @{user.username}
          </p>
          <p className="text-xs text-muted-foreground">
            Employee ID: #{user.employeeId}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Contact Details
            </h3>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Email Address:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{user.email || "—"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openUpdateModal("email_update")}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>Contact Number:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{user.contactNumber || "—"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openUpdateModal("phone_update")}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>Branch ID:</span>
              </div>
              <span className="font-medium">
                Branch #{user.branchId || "1"}
              </span>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Security &
              Credentials
            </h3>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <KeyRound className="h-4 w-4" />
                <span>Password:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">
                  ••••••••
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => openUpdateModal("pin_reset")}
                >
                  Change Password
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span>System Role:</span>
              </div>
              <span className="font-medium capitalize">{user.role}</span>
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Registered Address
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => openUpdateModal("address_update")}
            >
              <Edit2 className="h-3.5 w-3.5" /> Update Address
            </Button>
          </div>

          <p className="text-sm font-medium">{formatAddress(user.address)}</p>
        </div>
      </div>

      {/* Dynamic Update Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={
            actionType === "address_update" ? "sm:max-w-xl" : "sm:max-w-md"
          }
        >
          <DialogHeader>
            <DialogTitle>
              {step === "input"
                ? actionType === "pin_reset"
                  ? "Change Password"
                  : "Request Account Update"
                : "Verify One-Time Password"}
            </DialogTitle>
            <DialogDescription>
              {step === "input"
                ? "Enter your updated details. A 6-digit verification code will be sent to your registered email."
                : "Enter the 6-digit verification code sent to your registered email address."}
            </DialogDescription>
          </DialogHeader>

          {step === "input" ? (
            <div className="space-y-4 py-2">
              {actionType === "email_update" && (
                <div className="space-y-1.5">
                  <Label>New Email Address</Label>
                  <Input
                    type="email"
                    placeholder="name@sjmarketing.local"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
              )}

              {actionType === "phone_update" && (
                <div className="space-y-1.5">
                  <Label>New Contact Number</Label>
                  <Input
                    type="tel"
                    placeholder="09171234567"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
              )}

              {actionType === "pin_reset" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      maxLength={PASSWORD_MAX}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                    />
                    {inputValue.length > 0 && (
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-xs">
                        {PASSWORD_RULES.map((rule) => (
                          <li
                            key={rule.id}
                            className={
                              rule.test(inputValue)
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }
                          >
                            {rule.test(inputValue) ? "✓" : "○"} {rule.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      maxLength={PASSWORD_MAX}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword.length > 0 &&
                      confirmPassword !== inputValue && (
                        <p className="text-xs text-destructive">
                          Passwords do not match.
                        </p>
                      )}
                  </div>
                </>
              )}

              {/* Cascading Philippine Address Selector */}
              {actionType === "address_update" && (
                <PhilippineAddressSelector
                  value={addressForm}
                  onChange={setAddressForm}
                  disabled={isLoading}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>6-Digit OTP</Label>
                <Input
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="123456"
                  className="text-center font-mono tracking-widest text-lg"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {step === "input" ? (
              <Button onClick={handleSendOtp} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send OTP
              </Button>
            ) : (
              <Button onClick={handleVerifyOtp} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm & Apply Update
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
