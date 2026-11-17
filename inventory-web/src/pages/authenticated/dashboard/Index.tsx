import KpiCard from "@/features/reports/components/KpiCard";
import StockAlertsCard from "@/features/reports/components/StockAlertsCard";
import SalesAnalyticsCard from "@/features/reports/components/SalesAnalyticsCard";
import WarrantyAlertsCard from "@/features/reports/components/WarrantyAlertsCard";
import CashierPaymentCard from "@/features/reports/components/CashierPaymentCard";
import SalesIntegrityCard from "@/features/reports/components/SalesIntegrityCard";
import StockShrinkageCard from "@/features/reports/components/StockShrinkageCard";
import CustomerInsightsCard from "@/features/reports/components/CustomerInsightsCard";
import ServiceDeskCard from "@/features/reports/components/ServiceDeskCard";

export default function Index() {
  return (
    <div className="h-full w-full overflow-y-auto p-6 custom-scrollbar">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Top: High level KPI Numbers */}
        <KpiCard />

        {/* Controls: approvals/voids and stock losses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesIntegrityCard />
          <StockShrinkageCard />
        </div>

        {/* Customers and service desk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomerInsightsCard />
          <ServiceDeskCard />
        </div>

        {/* Middle: Operational Deep-Dives side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WarrantyAlertsCard />
          <CashierPaymentCard />
        </div>

        {/* Middle-Bottom: Inventory Movement & Stock Alerts */}
        <StockAlertsCard />

        {/* Bottom: Detailed Sales Trends & Time Graphs */}
        <SalesAnalyticsCard />
      </div>
    </div>
  );
}
