import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  Navigate,
} from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthPage } from "@/features/authentications";
import AuthenticatedPage from "@/pages/authenticated";
import { loginApi } from "@/features/authentications/api";
import { isInventoryClerk } from "@/features/authentications/utils/access";
import { SocketProvider } from "@/context/socketProvider";
import { ToastContainer } from "@/features/notifications";

// Pages
import DashboardPage from "@/pages/authenticated/dashboard/Dashboard";
import Index from "@/pages/authenticated/dashboard//Index";
import { loader as transactionLoader } from "@/features/items/view/SalesInvoiceRoute";
import CatalogPage from "@/pages/authenticated/catalog";
import BrandPage from "@/pages/authenticated/catalog/brand";
import CategoryPage from "@/pages/authenticated/catalog/category";
import AttributesPage from "@/pages/authenticated/catalog/attributes";
import UnitsPage from "@/pages/authenticated/catalog/units";
import VariantSpecificationsPage from "@/pages/authenticated/catalog/variantSpecifications";
import InventoryPage from "@/pages/authenticated/inventory/inventory";
import StockAdjustmentPage from "@/pages/authenticated/inventory/StockAdjustment";
import LiveMonitoringPage from "@/pages/authenticated/inventory/LiveMonitoring";
import PurchaseOrdersPage from "@/pages/authenticated/procurement/PurchaseOrders";
import ReportsPage from "@/pages/authenticated/Reports";
import StaffManagementPage from "@/pages/authenticated/management/StaffManagement";
import AuditTrailPage from "@/pages/authenticated/management/AuditTrail"; // <-- 1. Import AuditTrailPage
import CustomersPage from "@/features/user/view/CustomersPage";
import ParkedSalesPage from "@/pages/authenticated/sales/ParkedSales";
import TransactionsPage from "@/pages/authenticated/sales/Transactions";
import ServiceReportPage from "@/features/serviceReports/view/ServiceReportPage";
import ProfilePage from "@/features/user/view/ProfilePage";
import PendingAuthorizationPage from "@/pages/authenticated/sales/PendingAuthorization";
import { loader as pendingAuthorizationLoader } from "@/features/items/view/PendingAuthorizationRoute";

// Protected Layout Wrapper
function ProtectedLayout() {
  const isAuthenticated = loginApi.isAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SocketProvider>
      <AuthenticatedPage />
    </SocketProvider>
  );
}

function ClerkRedirect({ children }: { children: React.ReactNode }) {
  return isInventoryClerk() ? (
    <Navigate to="/authenticated/inventory/list" replace />
  ) : (
    children
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<AuthPage />} />

      {/* Authenticated Layout and Nested Routes */}
      <Route path="/authenticated" element={<ProtectedLayout />}>
        <Route
          index
          element={
            <Navigate
              to={isInventoryClerk() ? "inventory/list" : "dashboard"}
              replace
            />
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        {/* Dashboard Section */}
        <Route
          path="dashboard"
          element={
            <ClerkRedirect>
              <DashboardPage />
            </ClerkRedirect>
          }
        >
          <Route index element={<Index />} />
        </Route>
        {/* Sales */}
        <Route
          path="sales/parked-sales"
          element={
            <ClerkRedirect>
              <ParkedSalesPage />
            </ClerkRedirect>
          }
        />
        <Route
          path="sales/pending-authorization"
          element={
            <ClerkRedirect>
              <PendingAuthorizationPage />
            </ClerkRedirect>
          }
          loader={pendingAuthorizationLoader}
        />
        <Route
          path="sales/transactions"
          element={
            <ClerkRedirect>
              <TransactionsPage />
            </ClerkRedirect>
          }
          loader={transactionLoader}
        />
        {/* Catalog */}
        <Route
          path="catalog"
          element={<Navigate to="catalog/item-list" replace />}
        />
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
        <Route
          path="inventory"
          element={<Navigate to="inventory/list" replace />}
        />
        <Route path="inventory/list" element={<InventoryPage />} />
        <Route
          path="inventory/stock-adjustment"
          element={<StockAdjustmentPage />}
        />
        <Route
          path="inventory/live-monitoring"
          element={<LiveMonitoringPage />}
        />
        {/* After-Sales / Service */}
        <Route path="service-reports" element={<ServiceReportPage />} />
        {/* Procurement */}
        <Route
          path="procurement/purchase-orders"
          element={
            <ClerkRedirect>
              <PurchaseOrdersPage />
            </ClerkRedirect>
          }
        />
        {/* Management */}
        <Route
          path="management/staff"
          element={
            <ClerkRedirect>
              <StaffManagementPage />
            </ClerkRedirect>
          }
        />
        <Route
          path="management/audit-trail"
          element={
            <ClerkRedirect>
              <AuditTrailPage />
            </ClerkRedirect>
          }
        />{" "}
        <Route
          path="management/customers"
          element={
            <ClerkRedirect>
              <CustomersPage />
            </ClerkRedirect>
          }
        />
        {/* <-- 2. Added Route */}
        {/* Reports */}
        <Route
          path="reports/sales"
          element={
            <ClerkRedirect>
              <ReportsPage />
            </ClerkRedirect>
          }
        />
        <Route
          path="*"
          element={
            <Navigate
              to={isInventoryClerk() ? "inventory/list" : "dashboard"}
              replace
            />
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/authenticated" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </>,
  ),
);

export default function App() {
  return (
    <TooltipProvider>
      <RouterProvider router={router} />
      <ToastContainer />
    </TooltipProvider>
  );
}