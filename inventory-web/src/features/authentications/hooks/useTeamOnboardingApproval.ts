import { useState } from "react";
import { useApproveTeamOnboarding } from "../mutations/useApproveTeamOnboarding";
import { useDeleteTeamOnboarding } from "../mutations/useDeleteTeamOnboarding";
import type { TeamOnboardingRecord } from "../types/teamOnboarding";

type UseTeamOnboardingApprovalOptions = {
  onApprove?: (onboarding: TeamOnboardingRecord) => void;
  onDecline?: (onboarding: TeamOnboardingRecord) => void;
};

export function useTeamOnboardingApproval({ onApprove, onDecline }: UseTeamOnboardingApprovalOptions = {}) {
  const [selected, setSelected] = useState<TeamOnboardingRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const approveMutation = useApproveTeamOnboarding();
  const deleteMutation = useDeleteTeamOnboarding();

  const openDialog = (item: TeamOnboardingRecord) => {
    setSelected(item);
    setDialogOpen(true);
  };

  const handleApprove = async (item: TeamOnboardingRecord) => {
    try {
      await approveMutation.mutateAsync(item.team_onboarding_id);
      onApprove?.(item);
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to approve onboarding");
    }
  };

  const handleDecline = async (item: TeamOnboardingRecord) => {
    try {
      await deleteMutation.mutateAsync(item.team_onboarding_id);
      onDecline?.(item);
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to decline onboarding");
    }
  };

  const isMutating = approveMutation.status === "loading" || deleteMutation.status === "loading";

  return { selected, dialogOpen, setDialogOpen, openDialog, handleApprove, handleDecline, isMutating };
}
