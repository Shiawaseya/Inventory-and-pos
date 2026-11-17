import KpiCard from "@/features/reports/components/KpiCard";
import StockAlertsCard from "@/features/reports/components/StockAlertsCard";
import SalesAnalyticsCard from "@/features/reports/components/SalesAnalyticsCard";
import { Outlet } from "react-router-dom";

export default function DashboardPage() {
  return (
    /* h-full and overflow-y-auto ensures the container expands and scrolls */
    <div className="h-full w-full overflow-y-auto p-6 custom-scrollbar">
      <Outlet />
    </div>
  );
}
