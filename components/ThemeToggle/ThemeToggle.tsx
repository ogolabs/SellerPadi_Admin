"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs ${className}`}
      title={mounted ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
      aria-label="Toggle theme mode"
    >
      {mounted ? (
        resolvedTheme === "dark" ? (
          <Sun className="w-4 h-4 text-slate-200" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700" />
        )
      ) : (
        <span className="w-4 h-4 block" />
      )}
    </button>
  );
}

export default ThemeToggle;

