"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/cx";
import type { ReactNode } from "react";

type EyesoneScopeProps = {
  children: ReactNode;
};

export function EyesoneScope({ children }: EyesoneScopeProps) {
  const { dark, palette } = useTheme();
  return (
    <div className={cn("eyesone min-h-screen", dark && "dark")} data-palette={palette}>
      {children}
    </div>
  );
}
