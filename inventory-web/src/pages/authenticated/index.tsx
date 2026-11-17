import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Header } from "./layout/Header";
import SideNav from "./layout/SideNav";
import TransactionPendingListener from "@/hooks/useTransactionPending";
import InvoiceAuthorizationListener from "@/hooks/useInvoiceAuthorization";
import { Outlet } from "react-router"; // Use Outlet instead of Routes/Route

export default function AuthenticatedPage() {
  return (
    <SidebarProvider>
      <TransactionPendingListener />
      <InvoiceAuthorizationListener />
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar side="left" variant="sidebar" collapsible="icon">
          <SideNav />
        </Sidebar>
        <SidebarInset className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Header />
          <main className="flex-1 p-8 overflow-y-auto w-full min-h-0 relative">
            {/* Child routes render here */}
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
