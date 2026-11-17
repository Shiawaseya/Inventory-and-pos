import { Button } from "@/components/ui/button";
import { Bell, Moon, Sun, Palette } from "lucide-react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { loginApi } from "@/features/authentications/api/loginApi";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  applyThemePreset,
  getSavedThemePreset,
  themePresets,
  type ThemePreset,
} from "@/lib/themes";

const THEME_STORAGE_KEY = "theme";

export function Header() {
  const navigate = useNavigate();
  const user = loginApi.getUser();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [colorPreset, setColorPreset] = useState<ThemePreset>("default");

  // derive a color from the user's name/username for avatar background
  const getAvatarColor = (seed?: string) => {
    const s = String(seed ?? "").trim() || "guest";
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      // simple hash
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360;
    // return an HSL color with good contrast
    return `hsl(${hue} 60% 40%)`;
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

    // Initialize color preset
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
    navigate("/login");
  };

  return (
    <header className="border-b bg-card w-full px-4">
      <div className="flex items-center justify-between w-full py-4">
        {/* Left - User info with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 group">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-white font-medium"
                style={{
                  backgroundColor: getAvatarColor(
                    (user as any)?.name ?? user?.username,
                  ),
                }}
              >
                {(() => {
                  const name = (user as any)?.name ?? user?.username ?? "";
                  const parts = String(name).split(/\s+/).filter(Boolean);
                  if (parts.length === 0) return "G";
                  if (parts.length === 1)
                    return parts[0].slice(0, 2).toUpperCase();
                  return (
                    parts[0][0] + parts[parts.length - 1][0]
                  ).toUpperCase();
                })()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-sm font-medium">
                  {(user as any)?.name ?? user?.username ?? "Guest"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(user as any)?.role ?? "User"}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            <div className="px-3 py-2">
              <div className="text-sm font-medium">
                {(user as any)?.name ?? user?.username ?? "Guest"}
              </div>
              <div className="text-xs text-muted-foreground">
                {(user as any)?.role ?? "User"}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/profile")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleLogout}
              className="text-destructive"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right - Actions */}
        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost">
            <Bell className="w-5 h-5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleThemeToggle}
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                title="Change color theme"
                aria-label="Change color theme"
              >
                <Palette className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Theme Colors</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(themePresets).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() =>
                        handleColorPresetChange(key as ThemePreset)
                      }
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        colorPreset === key
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-xs font-medium">{preset.label}</div>
                      <div className="flex gap-1 mt-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: preset.colors.primary }}
                        />
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: preset.colors.secondary }}
                        />
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: preset.colors.accent }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* user/menu moved to left */}
        </div>
      </div>
    </header>
  );
}
