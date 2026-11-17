import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Package,
  ArrowRightLeft,
  ShoppingCart,
  BarChart3,
  Users,
  Wrench,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import CompaniCard from "@/components/CompanyCard";
import {
  isInventoryClerk,
  isSric,
} from "@/features/authentications/utils/access";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavSubItem {
  title: string;
  url: string;
}

interface NavSectionItem {
  title: string;
  icon: LucideIcon;
  url?: string;
  items?: NavSubItem[];
  requiresFullAccess?: boolean;
}

const navigationItems: NavSectionItem[] = [
  {
    title: "Dashboard",
    icon: Home,
    url: "/authenticated/dashboard",
    requiresFullAccess: true,
  },
  {
    title: "Sales Report",
    icon: BarChart3,
    url: "/authenticated/reports/sales",
    requiresFullAccess: true,
  },
  {
    title: "Sales",
    icon: ShoppingCart,
    requiresFullAccess: true,
    items: [
      { title: "Parked Sales", url: "/authenticated/sales/parked-sales" },
      {
        title: "Pending Authorization",
        url: "/authenticated/sales/pending-authorization",
      },
      { title: "Transactions", url: "/authenticated/sales/transactions" },
    ],
  },
  {
    title: "Catalog",
    icon: Package,
    requiresFullAccess: true,
    items: [
      { title: "Item List", url: "/authenticated/catalog/item-list" },
      { title: "Brand", url: "/authenticated/catalog/brand" },
      { title: "Category", url: "/authenticated/catalog/category" },
      { title: "Attributes", url: "/authenticated/catalog/attributes" },
      { title: "Measurement Units", url: "/authenticated/catalog/units" },
    ],
  },
  {
    title: "Inventory",
    icon: ArrowRightLeft,
    items: [
      { title: "Inventory List", url: "/authenticated/inventory/list" },
      {
        title: "Stock Adjustment",
        url: "/authenticated/inventory/stock-adjustment",
      },
    ],
  },
  {
    title: "After-Sales / Service",
    icon: Wrench,
    requiresFullAccess: true,
    items: [{ title: "Service Report", url: "/authenticated/service-reports" }],
  },
  {
    title: "Management",
    icon: Users,
    requiresFullAccess: true,
    items: [
      { title: "Staff Management", url: "/authenticated/management/staff" },
      { title: "Customers", url: "/authenticated/management/customers" },
      { title: "Audit Trail", url: "/authenticated/management/audit-trail" },
    ],
  },
];

const SRIC_HIDDEN_TITLES = new Set(["Dashboard", "Sales", "Management"]);

export default function SideNav() {
  const inventoryClerk = isInventoryClerk();
  const sric = isSric();
  const location = useLocation();
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const isChildActive = (items?: NavSubItem[]) =>
    Boolean(items?.some((item) => location.pathname.startsWith(item.url)));

  const filteredItems = navigationItems.filter((item) => {
    // Specifically hide Dashboard, Sales, and Management for sr-ic
    if (sric && SRIC_HIDDEN_TITLES.has(item.title)) {
      return false;
    }
    // General check for inventory clerk roles against requiresFullAccess
    if (inventoryClerk && item.requiresFullAccess) {
      return false;
    }
    return true;
  });

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border/60 p-2.5 overflow-hidden">
        <div className="group-data-[collapsible=icon]:scale-90 transition-transform origin-left">
          <CompaniCard name="S & J Marketing" location="Bongabon" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 overflow-x-hidden overflow-y-auto">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2.5 mb-1 group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>

          <SidebarMenu className="gap-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;

              // Standalone link
              if (!item.items) {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                      className="h-9 px-2.5 font-medium transition-colors text-sidebar-foreground/80 hover:text-sidebar-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                    >
                      <NavLink
                        to={item.url!}
                        className="flex items-center gap-3"
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              const isGroupActive = isChildActive(item.items);

              // Flyout menu for collapsed rail
              if (isCollapsed) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={isGroupActive}
                          className="h-9 px-2.5 justify-center font-medium data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                        >
                          <Icon className="size-4 shrink-0" />
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        side="right"
                        align="start"
                        sideOffset={12}
                        className="w-52 p-1.5 shadow-xl bg-popover/95 backdrop-blur-sm z-50 border border-border"
                      >
                        <DropdownMenuLabel className="text-xs font-semibold px-2 py-1.5 text-muted-foreground">
                          {item.title}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="my-1" />
                        {item.items.map((subItem) => {
                          const isActive = location.pathname === subItem.url;
                          return (
                            <DropdownMenuItem
                              key={subItem.url}
                              asChild
                              className="p-0"
                            >
                              <NavLink
                                to={subItem.url}
                                className={`flex w-full items-center rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                  isActive
                                    ? "bg-primary text-primary-foreground font-semibold"
                                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                                }`}
                              >
                                {subItem.title}
                              </NavLink>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                );
              }

              // Accordion for expanded mode
              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isGroupActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        className="h-9 px-2.5 font-medium transition-colors text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                        <ChevronRight className="ml-auto size-3.5 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
                      <SidebarMenuSub className="ml-5 my-1 border-l border-sidebar-border/60 pl-2.5 gap-0.5">
                        {item.items.map((subItem) => {
                          const isActive = location.pathname === subItem.url;
                          return (
                            <SidebarMenuSubItem key={subItem.url}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive}
                                className={`h-8 rounded-md text-xs transition-colors ${
                                  isActive
                                    ? "bg-primary/10 font-semibold text-primary"
                                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                }`}
                              >
                                <NavLink to={subItem.url} className="truncate">
                                  {subItem.title}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}
