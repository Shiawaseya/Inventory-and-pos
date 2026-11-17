import { Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./dashboard/Dashboard";
import CatalogPage from "./catalog";
import InventoryPage from "./inventory/inventory";
import LiveMonitoringPage from "./inventory/LiveMonitoring";
import BrandPage from "./catalog/brand";
import CategoryPage from "./catalog/category";
import AttributesPage from "./catalog/attributes";
import UnitsPage from "./catalog/units";
import VariantSpecificationsPage from "./catalog/variantSpecifications";
import StockAdjustmentPage from "./inventory/StockAdjustment";
import PurchaseOrdersPage from "./procurement/PurchaseOrders";
import ReportsPage from "./Reports";
import StaffManagementPage from "./management/StaffManagement";
import AuditTrailPage from "./management/AuditTrail";
import CustomersPage from "@/features/user/view/CustomersPage";

export default function MainRoutes() {
  return (
    <Routes>
      {/* Index Redirect */}
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />

      {/* Catalog */}
      <Route path="catalog" element={<Navigate to="item-list" replace />} />
      <Route path="catalog/item-list" element={<CatalogPage />} />
      <Route path="catalog/brand" element={<BrandPage />} />
      <Route path="catalog/category" element={<CategoryPage />} />
      <Route path="catalog/attributes" element={<AttributesPage />} />
      <Route path="catalog/units" element={<UnitsPage />} />
      <Route
        path="catalog/variant-specifications"
        element={<VariantSpecificationsPage />}
      />

      {/* Inventory */}
      <Route path="inventory" element={<Navigate to="list" replace />} />
      <Route path="inventory/list" element={<InventoryPage />} />
      <Route
        path="inventory/stock-adjustment"
        element={<StockAdjustmentPage />}
      />
      <Route
        path="inventory/live-monitoring"
        element={<LiveMonitoringPage />}
      />

      {/* Procurement */}
      <Route
        path="procurement/purchase-orders"
        element={<PurchaseOrdersPage />}
      />

      {/* Management */}
      <Route path="management" element={<Navigate to="staff" replace />} />
      <Route path="management/staff" element={<StaffManagementPage />} />
      <Route path="management/customers" element={<CustomersPage />} />
      <Route path="management/audit-trail" element={<AuditTrailPage />} />

      {/* Reports */}
      <Route path="reports" element={<ReportsPage />} />

      {/* Catch-all fallback */}
      <Route
        path="*"
        element={<Navigate to="/authenticated/dashboard" replace />}
      />
    </Routes>
  );
}
