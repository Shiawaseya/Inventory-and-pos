import { useQuery } from "@tanstack/react-query";
import { employeeApi } from "@/api/employeeApi";

/**
 * React Query hook to fetch an employee by ID
 * @param id Employee ID
 */
export function useEmployee(id: number) {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: () => employeeApi.getById(id),
    enabled: !!id,
  });
}
