import { useQuery } from "@tanstack/react-query";
import { customerApi, type CustomerFilters } from "../api/customerApi";

export function useCustomers(
  page: number,
  perPage = 10,
  filters: CustomerFilters = {},
) {
  const search = filters.search ?? "";
  const sort = filters.sort ?? "";

  return useQuery({
    queryKey: ["customers", page, perPage, search, sort],
    queryFn: () => customerApi.list(page, perPage, { search, sort }),
    placeholderData: (previousData) => previousData,
  });
}
