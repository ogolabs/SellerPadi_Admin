"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

export type Theme = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (newTheme: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "sellerpadi_theme";
const LEGACY_STORAGE_KEY = "SellerPadi_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to light mode per brand rules
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Compute resolved theme from system preference
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((targetTheme: Theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const resolved = targetTheme === "system" ? getSystemTheme() : targetTheme;

    setResolvedTheme(resolved);

    if (resolved === "dark") {
      if (!root.classList.contains("dark")) {
        root.classList.add("dark");
      }
      if (root.style.colorScheme !== "dark") {
        root.style.colorScheme = "dark";
      }
    } else {
      if (root.classList.contains("dark")) {
        root.classList.remove("dark");
      }
      if (root.style.colorScheme !== "light") {
        root.style.colorScheme = "light";
      }
    }

    // Dynamically synchronize meta theme-color for mobile status bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", resolved === "dark" ? "#0B1220" : "#F8FAFC");
    }
  }, [getSystemTheme]);

  // Initial mount: load saved theme from localStorage, default to 'light'
  useEffect(() => {
    setMounted(true);
    try {
      const saved = (localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)) as Theme | null;
      if (saved && (saved === "system" || saved === "dark" || saved === "light")) {
        setThemeState(saved);
        applyTheme(saved);
      } else {
        setThemeState("light");
        applyTheme("light");
      }
    } catch {
      setThemeState("light");
      applyTheme("light");
    }
  }, [applyTheme]);

  // Listen to system preference changes when in 'system' mode
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorageChange = (e: StorageEvent) => {
      if ((e.key === STORAGE_KEY || e.key === LEGACY_STORAGE_KEY) && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (newTheme === "system" || newTheme === "dark" || newTheme === "light") {
          setThemeState(newTheme);
          applyTheme(newTheme);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [applyTheme]);

  // Change theme handler
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      localStorage.setItem(LEGACY_STORAGE_KEY, newTheme);
    } catch {
      // Storage unavailable fallback
    }
    applyTheme(newTheme);
  }, [applyTheme]);

  // Toggle theme directly between light and dark
  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: mounted ? resolvedTheme : "light",
      setTheme,
      toggleTheme,
      mounted,
    }),
    [theme, resolvedTheme, mounted, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

