import type { CSSProperties } from "react";
import { FONT_STACKS, type BiopageFont, type BiopageProfileMode } from "@short/core";
import { cn } from "@/lib/cx";
import {
  bioButtonClass,
  bioButtonStyle,
  bioSurfaceStyle,
  initials,
  usesThemeBackground,
  type BioLook,
} from "./bio-style";

type BioThumbnailProps = BioLook & {
  displayName: string;
  avatarUrl?: string | null;
  profileMode?: BiopageProfileMode;
  logoUrl?: string | null;
  profileText?: string;
  fontFamily?: BiopageFont;
  /** Number of placeholder link buttons drawn under the name. */
  buttons?: number;
  className?: string;
};

/**
 * A miniature, non-interactive sketch of a bio page in its real palette: avatar, name
 * and a few buttons. Cheap enough for a grid of cards (no blocks are loaded), and it
 * reads as "this is what my page looks like" at a glance.
 */
export function BioThumbnail({
  displayName,
  avatarUrl,
  profileMode = "photo",
  logoUrl,
  profileText,
  fontFamily = "sans",
  buttons = 3,
  className,
  ...look
}: BioThumbnailProps) {
  const surface: CSSProperties = { fontFamily: FONT_STACKS[fontFamily], ...bioSurfaceStyle(look) };
  const buttonStyle = bioButtonStyle(look);
  const buttonClass = bioButtonClass(look.buttonStyle);

  return (
    <div
      className={cn(
        `bio-theme-${look.theme}`,
        "relative flex h-full w-full flex-col items-center overflow-hidden bg-bio-bg px-6 pt-6 text-bio-fg",
        usesThemeBackground(look) &&
          "bg-[radial-gradient(130%_60%_at_50%_0%,var(--bio-bg-alt)_0%,transparent_72%)]",
        className,
      )}
      style={surface}
      aria-hidden="true"
    >
      {profileMode === "logo" && logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded media
        <img src={logoUrl} alt="" className="h-9 max-w-24 object-contain" />
      ) : profileMode === "text" ? (
        <span className="text-xl leading-none font-extrabold tracking-tight">
          {(profileText || initials(displayName)).slice(0, 6)}
        </span>
      ) : avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded media
        <img src={avatarUrl} alt="" className="size-10 rounded-full object-cover ring-2 ring-bio-bg" />
      ) : (
        <span className="flex size-10 items-center justify-center rounded-full bg-bio-accent text-sm font-bold text-bio-on-accent">
          {initials(displayName)}
        </span>
      )}
      <span className="mt-2 max-w-full truncate text-[13px] leading-5 font-bold">{displayName}</span>
      <span className="mt-1 h-1.5 w-20 rounded-full bg-current opacity-20" />
      <span className="mt-4 flex w-full flex-col gap-2">
        {Array.from({ length: buttons }, (_, index) => (
          <span
            key={index}
            className={cn(
              "block h-6 w-full",
              buttonClass,
              "shadow-none",
              look.buttonStyle !== "pill" && "rounded-md",
            )}
            style={buttonStyle}
          />
        ))}
      </span>
    </div>
  );
}
