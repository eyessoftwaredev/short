"use client";

import { persistThemeAction } from "@/app/(panel)/settings/actions";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import palettesData from "@/data/palettes.json";

export const paletteIds = ["teal", "graphite", "forest", "amber", "violet", "rose"] as const;

export type PaletteId = (typeof paletteIds)[number];

const PALETTE_KEY = "eyesone-palette";
const THEME_KEY = "short-theme";

function isPaletteId(value: string): value is PaletteId {
  return (paletteIds as readonly string[]).includes(value);
}

type ThemeContextValue = {
  dark: boolean;
  toggleTheme: () => void;
  setDark: (value: boolean) => void;
  palette: PaletteId;
  setPalette: (value: PaletteId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  defaultDark?: boolean;
};

function writeTheme(dark: boolean): void {
  try {
    window.localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    document.cookie = `${THEME_KEY}=${dark ? "dark" : "light"}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    /* ignore quota / private mode */
  }
  void persistThemeAction(dark ? "dark" : "light");
}

export function ThemeProvider({ children, defaultDark = false }: ThemeProviderProps) {
  const [dark, setDarkState] = useState(defaultDark);
  const [palette, setPaletteState] = useState<PaletteId>(
    isPaletteId(palettesData.default) ? palettesData.default : "teal",
  );

  useEffect(() => {
    try {
      const storedPalette = window.localStorage.getItem(PALETTE_KEY);
      if (storedPalette && isPaletteId(storedPalette)) {
        setPaletteState(storedPalette);
      }
      const storedTheme = window.localStorage.getItem(THEME_KEY);
      if (storedTheme === "dark" || storedTheme === "light") {
        setDarkState(storedTheme === "dark");
      }
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const setDark = useCallback((value: boolean) => {
    setDarkState(value);
    writeTheme(value);
  }, []);

  const toggleTheme = useCallback(() => {
    setDarkState((prev) => {
      const next = !prev;
      writeTheme(next);
      return next;
    });
  }, []);

  const setPalette = useCallback((value: PaletteId) => {
    setPaletteState(value);
    try {
      window.localStorage.setItem(PALETTE_KEY, value);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const value = useMemo(
    () => ({
      dark,
      toggleTheme,
      setDark,
      palette,
      setPalette,
    }),
    [dark, toggleTheme, setDark, palette, setPalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
