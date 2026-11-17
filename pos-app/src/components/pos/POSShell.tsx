import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Bell,
  Check,
  ChevronsUpDown,
  ClipboardList,
  CircleHelp,
  CreditCard,
  FileClock,
  FileText,
  LogOut,
  Moon,
  PackageSearch,
  Palette,
  ScanLine,
  Search,
  Settings,
  Sun,
  User,
  Wifi,
  type LucideIcon,
} from "lucide-react";

import CompaniCard from "@/components/CompanyCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { loginApi } from "@/features/authentications/api";
import {
  applyThemePreset,
  getSavedThemePreset,
  themePresets,
  type ThemePreset,
} from "@/lib/themes";

const THEME_STORAGE_KEY = "theme";

type Role = "cashier" | "manager" | "admin";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  hotkey?: string;
  badge?: number;
  roles: Role[];
}

const navigation: readonly NavItem[] = [
  {
    label: "Checkout / Terminal",
    to: "/checkout",
    icon: CreditCard,
    roles: ["cashier", "manager", "admin"],
  },
  {
    label: "Parked Sales",
    to: "/parked-sales",
    icon: FileClock,
    roles: ["cashier", "manager", "admin"],
  },
  {
    label: "Recent Receipts",
    to: "/recent-receipts",
    icon: BadgeCheck,
    roles: ["cashier", "manager", "admin"],
  },
  {
    label: "Stock & Price Checker",
    to: "/stock-checker",
    icon: PackageSearch,
    roles: ["cashier", "manager", "admin"],
  },
  {
    label: "Service Reports",
    to: "/service-report",
    icon: ClipboardList,
    roles: ["cashier", "manager", "admin"],
  },
  {
    label: "Sales Reports",
    to: "/reports",
    icon: FileText,
    roles: ["cashier", "manager", "admin"],
  },
] as const;

function getRole(): Role {
  const role = String(loginApi.getUser()?.role ?? "cashier").toLowerCase();
  return role.includes("admin")
    ? "admin"
    : role.includes("manager")
      ? "manager"
      : "cashier";
}

function POSSidebar() {
  const location = useLocation();
  const role = getRole();
  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(role),
  );

  return (
    <Sidebar collapsible="icon">
      {/* Header with Company Card */}
      <SidebarHeader className="border-b border-sidebar-border/60 p-2.5 overflow-hidden">
        <div className="group-data-[collapsible=icon]:scale-90 transition-transform origin-left">
          <CompaniCard name="S & J Marketing" location="Bongabon" />
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="px-2 py-3 overflow-x-hidden overflow-y-auto">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2.5 mb-1 group-data-[collapsible=icon]:hidden">
            POS Navigation
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {visibleNavigation.map(
              ({ label, to, icon: Icon, badge, hotkey }) => {
                const isActive = location.pathname === to;
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      tooltip={label}
                      isActive={isActive}
                      className="h-9 px-2.5 font-medium transition-colors text-sidebar-foreground/80 hover:text-sidebar-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                    >
                      <Link to={to} className="flex items-center gap-3">
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">
                          {label}
                        </span>
                        {hotkey && (
                          <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                            {hotkey}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                    {badge !== undefined && (
                      <SidebarMenuBadge className="bg-[#be5b38] text-white hover:bg-[#be5b38]/90 font-bold text-[10px] group-data-[collapsible=icon]:hidden">
                        {badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              },
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

function POSHeader() {
  const navigate = useNavigate();
  const user = loginApi.getUser();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [colorPreset, setColorPreset] = useState<ThemePreset>("default");

  const userName = (user as any)?.name ?? user?.username ?? "Terminal operator";
  const userRole = (user as any)?.role ?? "Cashier";

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "G";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarColor = (seed?: string) => {
    const s = String(seed ?? "").trim() || "guest";
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 65% 42%)`;
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const resolvedTheme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : prefersDark
          ? "dark"
          : "light";

    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    setTheme(resolvedTheme);

    const preset = getSavedThemePreset();
    setColorPreset(preset);
  }, []);

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const handleColorPresetChange = (preset: ThemePreset) => {
    setColorPreset(preset);
    applyThemePreset(preset);
  };

  const handleLogout = () => {
    loginApi.logout();
    navigate({ to: "/login" as any });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/60 bg-background/80 px-4 sm:px-6 backdrop-blur-md transition-all">
      {/* Left: Sidebar trigger & quick search */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-foreground" />
      </div>

      {/* Right: Actions & User profile */}
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleThemeToggle}
          className="size-9 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Toggle dark/light theme"
        >
          {theme === "dark" ? (
            <Sun className="size-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="size-4 transition-transform duration-300 hover:-rotate-12" />
          )}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-9 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Change color theme"
            >
              <Palette className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 shadow-lg" align="end">
            <div className="space-y-2.5">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Theme Palette
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Choose your workspace accent
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(themePresets).map(([key, preset]) => {
                  const isSelected = colorPreset === key;
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        handleColorPresetChange(key as ThemePreset)
                      }
                      className={`relative flex flex-col items-start gap-1.5 rounded-md border p-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border hover:border-border/80 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-[11px] font-medium leading-none">
                          {preset.label}
                        </span>
                        {isSelected && (
                          <Check className="size-3 text-primary" />
                        )}
                      </div>
                      <div className="flex gap-1">
                        <div
                          className="size-2.5 rounded-full ring-1 ring-border/50"
                          style={{ backgroundColor: preset.colors.primary }}
                        />
                        <div
                          className="size-2.5 rounded-full ring-1 ring-border/50"
                          style={{ backgroundColor: preset.colors.secondary }}
                        />
                        <div
                          className="size-2.5 rounded-full ring-1 ring-border/50"
                          style={{ backgroundColor: preset.colors.accent }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="mx-1 h-5 w-[1px] bg-border/60" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div
                className="relative flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-xs"
                style={{ backgroundColor: getAvatarColor(userName) }}
              >
                {getInitials(userName)}
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-background bg-emerald-500" />
              </div>
              <div className="hidden flex-col items-start text-left sm:flex">
                <span className="text-xs font-semibold leading-tight text-foreground">
                  {userName}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground capitalize">
                  {userRole}
                </span>
              </div>
              <ChevronsUpDown className="hidden size-3.5 text-muted-foreground/80 sm:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 shadow-lg">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-foreground leading-none">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground truncate leading-none capitalize">
                  {userRole}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 py-2"
              onSelect={() => navigate({ to: "/profile" as any })}
            >
              <User className="size-4 text-muted-foreground" />
              <span>Profile</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              onSelect={handleLogout}
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function POSShell() {
  return (
    <SidebarProvider>
      <POSSidebar />
      <SidebarInset className="min-w-0 h-screen overflow-hidden bg-background text-foreground flex flex-col">
        <POSHeader />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
