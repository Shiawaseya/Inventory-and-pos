import { useMutation, useQueryClient } from "@tanstack/react-query";
import { teamOnboardingApi } from "@/features/authentications/api/teamOnboardingApi";

export function useApproveTeamOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teamOnboardingId: number) => teamOnboardingApi.approvePendingOnboarding(teamOnboardingId),
    onSuccess: () => qc.invalidateQueries(["teamOnboarding", "pending"] as any),
  });
}
