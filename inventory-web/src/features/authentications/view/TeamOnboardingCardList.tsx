import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamOnboardingRecord } from "../types/teamOnboarding";

type TeamOnboardingCardListProps = {
  items: TeamOnboardingRecord[];
  isLoading?: boolean;
  title?: string;
  emptyMessage?: string;
};

function formatDate(value: string | null): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const normalized = status.toLowerCase();
  if (normalized === "used") return "default";
  if (normalized === "expired") return "destructive";
  if (normalized === "active") return "secondary";
  return "outline";
}

function TeamOnboardingCardSkeleton() {
  return (
    <Card className="gap-4">
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamOnboardingCardList({
  items,
  isLoading = false,
  title = "Pending Team Onboarding",
  emptyMessage = "No pending team onboarding records found.",
}: TeamOnboardingCardListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <TeamOnboardingCardSkeleton />
          <TeamOnboardingCardSkeleton />
          <TeamOnboardingCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {items.map((onboarding) => (
            <Card key={onboarding.team_onboarding_id} className="gap-4">
              <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{onboarding.full_name}</CardTitle>
                    <CardDescription>@{onboarding.username}</CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(onboarding.qr_status)} className="capitalize">
                    {onboarding.qr_status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Team Onboarding ID</p>
                    <p className="font-medium">{onboarding.team_onboarding_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">QR Code ID</p>
                    <p className="font-medium">{onboarding.qrcode_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Role</p>
                    <p className="font-medium capitalize">{onboarding.role.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Branch ID</p>
                    <p className="font-medium">{onboarding.branch_id}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div>
                    <p className="text-muted-foreground">QR Code</p>
                    <code className="block rounded border bg-muted px-2 py-1 text-xs break-all">{onboarding.qr_code}</code>
                  </div>

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
                      <p className="text-muted-foreground">Used At</p>
                      <p className="font-medium">{formatDate(onboarding.used_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires At</p>
                      <p className="font-medium">{formatDate(onboarding.expires_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Approval</p>
                      <p className="font-medium">{onboarding.approved_by_employee_id === null ? "Pending" : `Approved by ${onboarding.approved_by_employee_id}`}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
