import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { TeamOnboardingRecord } from "../types/teamOnboarding";

type TeamOnboardingCardProps = {
  onboarding: TeamOnboardingRecord;
};

function formatDate(value: string | null): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export function TeamOnboardingCard({ onboarding }: TeamOnboardingCardProps) {
  const displayName = onboarding.full_name?.trim() || [onboarding.first_name, onboarding.middle_name, onboarding.last_name].filter(Boolean).join(" ");
  const displayRole = onboarding.role.replace(/_/g, " ");

  return (
    <Card className="gap-4">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{displayName}</CardTitle>
            <CardDescription>@{onboarding.username}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Team Onboarding ID</p>
            <p className="font-medium">{onboarding.team_onboarding_id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Role</p>
            <p className="font-medium capitalize">{displayRole}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Branch ID</p>
            <p className="font-medium">{onboarding.branch_id}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Referred By</p>
              <p className="font-medium">{onboarding.referred_by || "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created By Employee ID</p>
              <p className="font-medium">{onboarding.created_by_employee_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created At</p>
              <p className="font-medium">{formatDate(onboarding.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Approval</p>
              <p className="font-medium">{onboarding.approved_by_employee_id === null ? "Pending" : `Approved by ${onboarding.approved_by_employee_id}`}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
