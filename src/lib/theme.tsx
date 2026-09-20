import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";
export type BackgroundStyle = "clean" | "grid" | "colorful";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  backgroundStyle: BackgroundStyle;
  setBackgroundStyle: (style: BackgroundStyle) => void;
};

const STORAGE_KEY = "bnoy-study-theme";
const LEGACY_STORAGE_KEY = "chronodeck-theme";
const BACKGROUND_KEY = "bnoy-study-background";

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  toggle: () => {},
  backgroundStyle: "grid",
  setBackgroundStyle: () => {},
});

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function applyBackground(style: BackgroundStyle) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.background = style;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [backgroundStyle, setBackgroundState] = useState<BackgroundStyle>("grid");

  useEffect(() => {
    // Day mode is the product default; the OS preference never forces dark.
    let initial: Theme = "light";
    try {
      const stored = (localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)) as Theme | null;
      if (stored === "dark" || stored === "light") initial = stored;
      const bg = localStorage.getItem(BACKGROUND_KEY) as BackgroundStyle | null;
      if (bg === "clean" || bg === "grid" || bg === "colorful") {
        setBackgroundState(bg);
        applyBackground(bg);
      } else applyBackground("grid");
    } catch {
      /* ignore */
    }
    setThemeState(initial);
    apply(initial);
  }, []);

  const setBackgroundStyle = useCallback((style: BackgroundStyle) => {
    setBackgroundState(style);
    applyBackground(style);
    try { localStorage.setItem(BACKGROUND_KEY, style); } catch { /* ignore */ }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    apply(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme,
      toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
      backgroundStyle,
      setBackgroundStyle,
    }),
    [theme, setTheme, backgroundStyle, setBackgroundStyle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
