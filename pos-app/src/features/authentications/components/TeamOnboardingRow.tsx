import { TableCell, TableRow } from "@/components/ui/table";
import type { TeamOnboardingRecord } from "../types/teamOnboarding";

type TeamOnboardingRowProps = {
  onboarding: TeamOnboardingRecord;
  onClick?: () => void;
};

function formatDate(value: string | null): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export function TeamOnboardingRow({ onboarding, onClick }: TeamOnboardingRowProps) {
  const displayName = onboarding.full_name?.trim() || [onboarding.first_name, onboarding.middle_name, onboarding.last_name].filter(Boolean).join(" ");

  return (
    <TableRow className={onClick ? "cursor-pointer" : undefined} onClick={onClick}>
      <TableCell className="font-medium">{displayName}</TableCell>
      <TableCell>@{onboarding.username}</TableCell>
      <TableCell className="capitalize">{onboarding.role.replace(/_/g, " ")}</TableCell>
      <TableCell>{onboarding.branch_id}</TableCell>
      <TableCell>
        {onboarding.approved_by_employee_id === null ? "Pending" : `Approved by ${onboarding.approved_by_employee_id}`}
      </TableCell>
      <TableCell>{onboarding.referred_by || "N/A"}</TableCell>
      <TableCell>{formatDate(onboarding.created_at)}</TableCell>
    </TableRow>
  );
}
