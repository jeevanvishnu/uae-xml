"use client";

import React, { createContext, useContext, useEffect } from "react";

type Theme = "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Permanently enforce dark theme across the application
    const root = document.documentElement;
    root.setAttribute("data-theme", "dark");
    root.classList.add("dark");
    root.classList.remove("light");
    try {
      localStorage.removeItem("mosctd_theme");
      localStorage.removeItem("ctdex_theme");
      localStorage.removeItem("itave_theme");
      localStorage.removeItem("ectc_theme");
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: "dark",
        toggleTheme: () => {},
        setTheme: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
