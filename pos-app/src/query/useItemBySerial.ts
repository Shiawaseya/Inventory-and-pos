import { useQuery } from "@tanstack/react-query";
import { getItemBySerialApi } from "@/api/getItemBySerialApi";

/**
 * React Query hook to fetch an item by serial number
 * @param serial Serial number string
 */
export function useItemBySerial(serial: string) {
  return useQuery({
    queryKey: ["item-by-serial", serial],
    queryFn: () => getItemBySerialApi(serial),
    enabled: !!serial,
    // Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
}
