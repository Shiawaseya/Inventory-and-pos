export type ThemePreset = 'default' | 'ocean' | 'sunset' | 'forest' | 'purple';

export interface ColorScheme {
  name: string;
  label: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    destructive: string;
  };
}

const THEME_STORAGE_KEY = 'theme-preset';

export const themePresets: Record<ThemePreset, ColorScheme> = {
  default: {
    name: 'default',
    label: 'Default',
    colors: {
      primary: 'oklch(0.205 0 0)',
      secondary: 'oklch(0.97 0 0)',
      accent: 'oklch(0.97 0 0)',
      destructive: 'oklch(0.577 0.245 27.325)',
    },
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    colors: {
      primary: 'oklch(0.35 0.15 250)',
      secondary: 'oklch(0.7 0.1 220)',
      accent: 'oklch(0.6 0.15 200)',
      destructive: 'oklch(0.577 0.245 27.325)',
    },
  },
  sunset: {
    name: 'sunset',
    label: 'Sunset',
    colors: {
      primary: 'oklch(0.55 0.2 30)',
      secondary: 'oklch(0.75 0.15 60)',
      accent: 'oklch(0.65 0.18 45)',
      destructive: 'oklch(0.577 0.245 27.325)',
    },
  },
  forest: {
    name: 'forest',
    label: 'Forest',
    colors: {
      primary: 'oklch(0.35 0.12 150)',
      secondary: 'oklch(0.65 0.1 140)',
      accent: 'oklch(0.7 0.12 120)',
      destructive: 'oklch(0.577 0.245 27.325)',
    },
  },
  purple: {
    name: 'purple',
    label: 'Purple',
    colors: {
      primary: 'oklch(0.45 0.15 290)',
      secondary: 'oklch(0.75 0.1 280)',
      accent: 'oklch(0.65 0.15 270)',
      destructive: 'oklch(0.577 0.245 27.325)',
    },
  },
};

export const applyThemePreset = (preset: ThemePreset) => {
  const scheme = themePresets[preset];
  const root = document.documentElement;

  // Apply light mode colors
  root.style.setProperty('--primary', scheme.colors.primary);
  root.style.setProperty('--secondary', scheme.colors.secondary);
  root.style.setProperty('--accent', scheme.colors.accent);
  root.style.setProperty('--destructive', scheme.colors.destructive);

  // Store preference
  localStorage.setItem(THEME_STORAGE_KEY, preset);
};

export const getSavedThemePreset = (): ThemePreset => {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return (saved as ThemePreset) || 'default';
};

export const initializeTheme = () => {
  const preset = getSavedThemePreset();
  applyThemePreset(preset);
};
