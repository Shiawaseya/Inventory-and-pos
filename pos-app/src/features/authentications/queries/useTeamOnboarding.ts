import { useQuery } from "@tanstack/react-query";
import { teamOnboardingApi } from "../api/teamOnboardingApi";
import type { TeamOnboardingRecord } from "../types/teamOnboarding";

export function useTeamOnboarding() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["teamOnboarding", "pending"],
    queryFn: teamOnboardingApi.getPendingOnboarding,
  });

  const pendingOnboarding: TeamOnboardingRecord[] = data?.data ?? [];

  return { pendingOnboarding, isLoading, isError, error, refetch };
}
