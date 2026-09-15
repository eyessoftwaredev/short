"use client";

import palettesData from "@/data/palettes.json";
import { useTheme, type PaletteId } from "@/components/providers/theme-provider";
import { cx } from "@/lib/cx";

export function PalettePicker() {
  const { palette, setPalette } = useTheme();

  return (
    <div className="kit-toc__palettes" role="group" aria-label="Color palette">
      {palettesData.items.map((item) => (
        <button
          key={item.id}
          type="button"
          data-palette={item.id}
          className={cx("kit-toc__swatch", palette === item.id && "kit-toc__swatch--on")}
          aria-label={item.label}
          aria-pressed={palette === item.id}
          onClick={() => setPalette(item.id as PaletteId)}
        />
      ))}
    </div>
  );
}
