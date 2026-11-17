import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Moon,
  Sun,
  Palette,
  User,
  Settings,
  LogOut,
  Check,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { loginApi } from "@/features/authentications/api/loginApi";
import {
  applyThemePreset,
  getSavedThemePreset,
  themePresets,
  type ThemePreset,
} from "@/lib/themes";

const THEME_STORAGE_KEY = "theme";

export function Header() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = loginApi.getUser();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [colorPreset, setColorPreset] = useState<ThemePreset>("default");

  const userName = (user as any)?.name ?? user?.username ?? "Guest";
  const userRole = (user as any)?.role ?? "User";

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

  const handleLogout = async () => {
    await loginApi.logout();
    queryClient.clear();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/60 bg-background/80 px-4 sm:px-6 backdrop-blur-md transition-all">
      {/* Left: Sidebar trigger & quick search info */}
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
              onSelect={() => navigate("/authenticated/profile")}
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
