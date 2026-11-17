// features/reports/queries/useExtraReports.ts
import { useQuery } from "@tanstack/react-query";
import {
  getSalesIntegrity,
  getStockShrinkage,
  getCustomerInsights,
  getServiceDesk,
  type DateRange,
} from "../api/extraReportsApi";

export const useSalesIntegrity = (range: DateRange) =>
  useQuery({
    queryKey: ["sales-integrity", range],
    queryFn: () => getSalesIntegrity(range),
    staleTime: 1000 * 60 * 2,
  });

export const useStockShrinkage = (range: DateRange) =>
  useQuery({
    queryKey: ["stock-shrinkage", range],
    queryFn: () => getStockShrinkage(range),
    staleTime: 1000 * 60 * 2,
  });

export const useCustomerInsights = (range: DateRange) =>
  useQuery({
    queryKey: ["customer-insights", range],
    queryFn: () => getCustomerInsights(range),
    staleTime: 1000 * 60 * 2,
  });

export const useServiceDesk = (range: DateRange) =>
  useQuery({
    queryKey: ["service-desk", range],
    queryFn: () => getServiceDesk(range),
    staleTime: 1000 * 60 * 2,
  });
