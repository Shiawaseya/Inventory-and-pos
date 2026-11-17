import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle } from "lucide-react";
import type { TeamOnboardingRecord } from "../types/teamOnboarding";

type TeamOnboardingApprovalDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onboarding: TeamOnboardingRecord | null;
  isLoading?: boolean;
  onApprove: (onboarding: TeamOnboardingRecord) => void;
  onDecline: (onboarding: TeamOnboardingRecord) => void;
};

function formatDate(value: string | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function TeamOnboardingApprovalDialog({
  open,
  onOpenChange,
  onboarding,
  isLoading = false,
  onApprove,
  onDecline,
}: TeamOnboardingApprovalDialogProps) {
  if (!onboarding) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Onboarding Request</DialogTitle>
          <DialogDescription>
            Approve or decline this team member's onboarding request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* User info */}
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">User</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-muted-foreground">Full Name</p>
                <p className="font-medium">{onboarding.full_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Username</p>
                <p className="font-medium">@{onboarding.username}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{onboarding.role.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Branch ID</p>
                <p className="font-medium">{onboarding.branch_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Submitted At</p>
                <p className="font-medium">{formatDate(onboarding.created_at)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* QR code info */}
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">QR Code</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge
                  variant={
                    onboarding.qr_status === "used"
                      ? "default"
                      : onboarding.qr_status === "expired"
                      ? "destructive"
                      : "secondary"
                  }
                  className="capitalize mt-0.5"
                >
                  {onboarding.qr_status}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Referred By</p>
                <p className="font-medium">{onboarding.referred_by || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Used At</p>
                <p className="font-medium">{formatDate(onboarding.used_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expires At</p>
                <p className="font-medium">{formatDate(onboarding.expires_at)}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">QR Code</p>
              <code className="mt-1 block rounded border bg-background px-2 py-1 text-xs break-all">
                {onboarding.qr_code}
              </code>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            disabled={isLoading}
            onClick={() => onDecline(onboarding)}
          >
            <XCircle className="w-4 h-4" />
            Decline
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={isLoading}
            onClick={() => onApprove(onboarding)}
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
