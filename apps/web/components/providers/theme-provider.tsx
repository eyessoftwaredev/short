"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import palettesData from "@/data/palettes.json";

export const paletteIds = ["teal", "graphite", "forest", "amber", "violet", "rose"] as const;

export type PaletteId = (typeof paletteIds)[number];

const PALETTE_KEY = "eyesone-palette";

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

export function ThemeProvider({ children, defaultDark = false }: ThemeProviderProps) {
  const [dark, setDarkState] = useState(defaultDark);
  const [palette, setPaletteState] = useState<PaletteId>(
    isPaletteId(palettesData.default) ? palettesData.default : "teal",
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PALETTE_KEY);
      if (stored && isPaletteId(stored)) {
        setPaletteState(stored);
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
  }, []);

  const toggleTheme = useCallback(() => {
    setDarkState((prev) => !prev);
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
