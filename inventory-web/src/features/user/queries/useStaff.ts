import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { loginApi } from "@/features/authentications/api/loginApi";
import { staffApi, type StaffQuery } from "../api/staffApi";

export function useStaff(queryOptions: StaffQuery = {}) {
  const branchId = Number(loginApi.getUser()?.branchId);
  const query = useQuery({
    queryKey: ["staff", branchId, queryOptions],
    queryFn: () => staffApi.getByBranch(branchId, queryOptions),
    enabled: Number.isInteger(branchId) && branchId > 0,
    // Keep the old rows on screen while paging/searching/sorting.
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    staffMembers: query.data?.data ?? [],
  };
}
