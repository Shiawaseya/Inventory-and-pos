import { NavLink } from "react-router-dom";
import {
  Home,
  Package,
  ArrowRightLeft,
  ShoppingCart,
  BarChart3,
  Users,
} from "lucide-react";
import CompaniCard from "@/components/CompanyCard";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";

export default function SideNav() {
  return (
    <div className="p-3">
      <SidebarHeader>
        <div className="px-2">
          <CompaniCard name="StockPilot Inc." location="San Francisco, CA" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/authenticated/dashboard">
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Package className="w-4 h-4" />
              <span>Catalog</span>
            </SidebarMenuButton>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <NavLink to="/authenticated/catalog/item-list">
                    Item List
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <NavLink to="/authenticated/catalog/brand">Brand</NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <NavLink to="/authenticated/catalog/category">
                    Category
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <ArrowRightLeft className="w-4 h-4" />
              <span>Inventory</span>
            </SidebarMenuButton>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <NavLink to="/authenticated/inventory/list">
                    Inventory
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <NavLink to="/authenticated/inventory/live-monitoring">
                    Live Monitoring
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <NavLink to="/authenticated/inventory/stock-adjustment">
                    Stock Adjustment
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <ShoppingCart className="w-4 h-4" />
              <span>Procurement</span>
            </SidebarMenuButton>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <NavLink to="/authenticated/procurement/purchase-orders">
                    Purchase Orders
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </SidebarMenuButton>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <NavLink to="/authenticated/reports">Overview</NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Users className="w-4 h-4" />
              <span>Management</span>
            </SidebarMenuButton>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild>
                  <NavLink to="/authenticated/management/staff">
                    Staff Management
                  </NavLink>
                </SidebarMenuSubButton>
                <SidebarMenuSubButton asChild>
                  <NavLink to="/authenticated/management/audit-trail">
                    Audit Trail
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </div>
  );
}
