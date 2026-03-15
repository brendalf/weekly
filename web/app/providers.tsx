"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { userPreferencesRepository } from "./repositories";

export type ThemePreference = "dark" | "light";

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
  toggleTheme: (userId: string) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("dark");

  function applyTheme(t: ThemePreference) {
    setThemeState(t);
    const html = document.documentElement;
    html.className = t;
    html.setAttribute("data-theme", t);
  }

  function setTheme(t: ThemePreference) {
    applyTheme(t);
  }

  function toggleTheme(userId: string) {
    const next: ThemePreference = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    userPreferencesRepository.updateTheme(userId, next);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
