import { useQuery } from "@tanstack/react-query";
import { loginApi } from "@/features/authentications/api/loginApi";
import { customerApi } from "../api/customerApi";

export function useCustomers(page: number, perPage = 10) {
  const branchId = Number(loginApi.getUser()?.branchId ?? 1);

  return useQuery({
    queryKey: ["customers", branchId, page, perPage],
    queryFn: () => customerApi.getByBranch(branchId, page, perPage),
    placeholderData: (previousData) => previousData,
  });
}
