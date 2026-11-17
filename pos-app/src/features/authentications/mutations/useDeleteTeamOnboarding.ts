import { useMutation, useQueryClient } from "@tanstack/react-query";
import { teamOnboardingApi } from "@/features/authentications/api/teamOnboardingApi";

export function useDeleteTeamOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teamOnboardingId: number) => teamOnboardingApi.deletePendingOnboarding(teamOnboardingId),
    onSuccess: () => qc.invalidateQueries(["teamOnboarding", "pending"] as any),
  });
}
