"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import { userPreferencesRepository } from "./repositories";

export type ThemePreference = "dark" | "light";

/**
 * Key the pre-paint script in `layout.tsx` reads to avoid a theme flash.
 * That script inlines the literal (a client module's exports are not readable
 * from a server component), so keep the two in sync.
 */
export const THEME_STORAGE_KEY = "weekly.theme";

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

/* The <html> element is the source of truth for the active theme: the blocking
   script in `layout.tsx` writes it before React boots. React subscribes to it
   rather than keeping a second copy that could drift. */

const listeners = new Set<() => void>();

function subscribeToTheme(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function readTheme(): ThemePreference {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function readServerTheme(): ThemePreference {
  return "dark";
}

function applyThemeToDocument(t: ThemePreference) {
  const html = document.documentElement;
  // Never assign to `className` — it wipes every other class on <html>.
  html.classList.remove("light", "dark");
  html.classList.add(t);
  html.setAttribute("data-theme", t);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, t);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); ignore.
  }
  listeners.forEach((listener) => listener());
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, readServerTheme);

  const setTheme = useCallback((t: ThemePreference) => {
    applyThemeToDocument(t);
  }, []);

  const toggleTheme = useCallback(
    (userId: string) => {
      const next: ThemePreference = theme === "dark" ? "light" : "dark";
      applyThemeToDocument(next);
      userPreferencesRepository.updateTheme(userId, next);
    },
    [theme],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
