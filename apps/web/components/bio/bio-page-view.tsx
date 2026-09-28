import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { BioBlock, BiopageFont, BiopageProfileMode, BiopageTheme } from "@short/core";
import { FONT_STACKS, sanitizeBioCss } from "@short/core";
import { Icon, type IconName } from "@/components/kit/icon";
import { cn } from "@/lib/cx";
import { BioFormCapture } from "./bio-form-capture";
import { socialHref, socialIcon, SOCIAL_LABELS } from "./bio-icons";
import {
  bioButtonClass,
  bioButtonStyle,
  bioSurfaceStyle,
  initials,
  usesThemeBackground,
} from "./bio-style";

export type BioPageData = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  theme: BiopageTheme;
  buttonStyle: string;
  blocks: BioBlock[];
  bgType?: "theme" | "color" | "gradient" | "image";
  bgColor?: string | null;
  bgGradient?: string | null;
  bgImageUrl?: string | null;
  buttonColor?: string | null;
  buttonTextColor?: string | null;
  textColor?: string | null;
  fontFamily?: BiopageFont;
  profileMode?: BiopageProfileMode;
  logoUrl?: string | null;
  profileText?: string;
  coverUrl?: string | null;
  adsEnabled?: boolean;
  adMobileImage?: string | null;
  adMobileHref?: string | null;
  adLeftImage?: string | null;
  adLeftHref?: string | null;
  adRightImage?: string | null;
  adRightHref?: string | null;
  customCss?: string;
};

type BioPageViewProps = {
  page: BioPageData;
  /** The builder preview renders inert blocks; the public page renders real anchors. */
  interactive?: boolean;
  /** Phone-frame preview in the builder: no viewport-fixed side ads, fill the scrollport. */
  embedded?: boolean;
  showBranding?: boolean;
  branding?: { name: string; href: string };
  formEndpoint?: string;
  className?: string;
};

/** Turns a watch/track page URL into the provider's embeddable player URL. */
export function embedSrc(provider: string, url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\.|^m\./, "");

    if (provider === "youtube") {
      let id: string | null = null;
      if (host === "youtu.be") {
        id = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
      } else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
        const segments = parsed.pathname.split("/").filter(Boolean);
        id =
          parsed.searchParams.get("v") ??
          // /shorts/<id>, /live/<id> and /embed/<id> are all shareable forms.
          (["shorts", "live", "embed"].includes(segments[0] ?? "") ? (segments[1] ?? null) : null);
      }
      return id && /^[\w-]{6,20}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
        : null;
    }

    if (provider === "vimeo") {
      if (!host.endsWith("vimeo.com")) {
        return null;
      }
      const id = parsed.pathname
        .split("/")
        .filter((segment) => /^\d+$/.test(segment))
        .pop();
      return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : null;
    }

    if (provider === "spotify") {
      if (!host.endsWith("spotify.com")) {
        return null;
      }
      // Localised share links look like /intl-tr/track/<id>; pasted players carry /embed/.
      const segments = parsed.pathname
        .split("/")
        .filter((segment) => segment !== "" && segment !== "embed" && !segment.startsWith("intl-"));
      return segments.length >= 2
        ? `https://open.spotify.com/embed/${segments.slice(0, 2).map(encodeURIComponent).join("/")}`
        : null;
    }
  } catch {
    return null;
  }
  return null;
}

const PROVIDER_NAMES: Record<string, string> = { youtube: "YouTube", spotify: "Spotify", vimeo: "Vimeo" };

/** Spotify's compact player suits a single track or episode; lists need the tall one. */
function embedHeightClass(provider: string, src: string): string {
  if (provider !== "spotify") {
    return "aspect-video";
  }
  return /\/embed\/(track|episode)\//.test(src) ? "h-[152px]" : "h-[352px]";
}

function cssToStyle(css: string): CSSProperties {
  if (css === "") {
    return {};
  }
  const style: Record<string, string> = {};
  for (const part of css.split(";")) {
    const colon = part.indexOf(":");
    if (colon < 1) {
      continue;
    }
    const property = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    if (property === "" || value === "") {
      continue;
    }
    const camel = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    style[camel] = value;
  }
  return style;
}

function Banner({
  src,
  href,
  className,
  interactive,
}: {
  src: string;
  href: string | null;
  className?: string;
  interactive: boolean;
}) {
  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN
    <img src={src} alt="" loading="lazy" decoding="async" className={cn("block w-full object-cover", className)} />
  );
  if (href && interactive) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow sponsored" className="block no-underline">
        {image}
      </a>
    );
  }
  return image;
}

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bio-accent";

/** Staggered entrance: a short rise per block, skipped entirely under reduced motion. */
function entrance(index: number): { className: string; style: CSSProperties } {
  return {
    className: "motion-safe:animate-slide-in-up",
    style: { animationDelay: `${Math.min(index, 10) * 40}ms`, animationFillMode: "both" },
  };
}

export function BioPageView({
  page,
  interactive = true,
  embedded = false,
  showBranding = true,
  branding,
  formEndpoint,
  className,
}: BioPageViewProps) {
  const t = useTranslations("bio.public");
  const buttonClass = bioButtonClass(page.buttonStyle);
  const buttonStyle = bioButtonStyle(page);
  const font = page.fontFamily ?? "sans";
  const requestedMode = page.profileMode ?? "photo";
  // A logo page without a logo falls back to the avatar/initials instead of an empty gap.
  const mode = requestedMode === "logo" && !page.logoUrl ? "photo" : requestedMode;
  const customCss = sanitizeBioCss(page.customCss ?? "");
  const rootStyle: CSSProperties = {
    fontFamily: FONT_STACKS[font],
    ...bioSurfaceStyle(page),
    ...cssToStyle(customCss),
  };
  const themedBackground = usesThemeBackground(page);

  const hasSideAds =
    !embedded && page.adsEnabled && Boolean(page.adLeftImage || page.adRightImage);
  const visibleBlocks = page.blocks.filter((block) => block.visible !== false);

  function renderBlock(block: BioBlock): ReactNode {
    if (block.type === "link") {
      const hasIcon = Boolean(block.iconUrl || block.iconName);
      const content = (
        <>
          {block.iconUrl ? (
            <span className="absolute left-2.5 flex size-9 items-center justify-center overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN */}
              <img src={block.iconUrl} alt="" width={36} height={36} className="size-full object-cover" />
            </span>
          ) : block.iconName ? (
            <span className="absolute left-2.5 flex size-9 items-center justify-center" aria-hidden="true">
              <Icon name={block.iconName as IconName} className="text-lg" />
            </span>
          ) : null}
          <span className="line-clamp-2 min-w-0 break-words">{block.label}</span>
        </>
      );

      const classes = cn(
        "relative flex min-h-14 w-full items-center justify-center py-3 text-center text-[15px] leading-snug font-semibold no-underline transition-[translate,scale,box-shadow,background-color] duration-200 ease-out hover:no-underline",
        hasIcon ? "px-14" : "px-6",
        buttonClass,
        block.highlighted && "ring-2 ring-bio-accent ring-offset-2 ring-offset-bio-bg",
        interactive &&
          cn(
            FOCUS_RING,
            "hover:shadow-[0_8px_20px_-8px_rgb(0_0_0/0.3)] active:scale-[0.985] motion-safe:hover:-translate-y-0.5",
          ),
      );
      const newTab = block.newTab !== false;

      return interactive ? (
        <a
          href={block.destination}
          className={classes}
          style={buttonStyle}
          target={newTab ? "_blank" : undefined}
          rel={newTab ? "noopener noreferrer nofollow" : "nofollow"}
          data-bio-block={block.id}
        >
          {content}
          {newTab ? <span className="sr-only"> ({t("opensInNewTab")})</span> : null}
        </a>
      ) : (
        <span className={classes} style={buttonStyle}>
          {content}
        </span>
      );
    }

    if (block.type === "social") {
      return (
        <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-1 p-0 py-0.5">
          {block.items.map((item, index) => {
            const mark = socialIcon(item.platform);
            const label = SOCIAL_LABELS[item.platform] ?? item.platform;
            const classes = cn(
              "flex size-11 items-center justify-center rounded-full text-bio-fg no-underline transition-colors duration-150 hover:bg-bio-fg/10 hover:text-bio-fg hover:no-underline",
              interactive && FOCUS_RING,
            );

            return (
              <li key={`${item.platform}-${index}`}>
                {interactive ? (
                  <a
                    href={socialHref(item.platform, item.url)}
                    aria-label={label}
                    title={label}
                    className={classes}
                    target={item.platform === "email" ? undefined : "_blank"}
                    rel="noopener noreferrer nofollow"
                    data-bio-block={block.id}
                  >
                    <Icon name={mark} className="text-[22px]" />
                  </a>
                ) : (
                  <span aria-label={label} title={label} className={classes}>
                    <Icon name={mark} className="text-[22px]" />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      );
    }

    if (block.type === "header") {
      return (
        <h2 className="m-0 pt-3 text-center text-base leading-6 font-semibold tracking-[-0.01em] break-words text-bio-fg">
          {block.text}
        </h2>
      );
    }

    if (block.type === "text") {
      if (block.body.trim() === "") {
        return null;
      }
      return (
        <p
          className={cn(
            "m-0 text-[15px] leading-relaxed break-words whitespace-pre-line text-bio-fg-muted",
            block.align === "left" ? "text-left" : "text-center",
          )}
        >
          {block.body}
        </p>
      );
    }

    if (block.type === "image") {
      if (!block.url) {
        return interactive ? null : (
          <span className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl border border-dashed border-bio-border text-bio-fg-muted">
            <Icon name="image" className="text-2xl" />
          </span>
        );
      }
      const image = (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN
        <img
          src={block.url}
          alt={block.alt}
          loading="lazy"
          decoding="async"
          className="block w-full rounded-2xl border border-bio-border object-cover"
        />
      );

      return block.href && interactive ? (
        <a
          href={block.href}
          className={cn(
            "block rounded-2xl no-underline transition-transform duration-200 motion-safe:hover:-translate-y-0.5",
            FOCUS_RING,
          )}
          target="_blank"
          rel="noopener noreferrer nofollow"
          data-bio-block={block.id}
        >
          {image}
        </a>
      ) : (
        image
      );
    }

    if (block.type === "embed") {
      const src = embedSrc(block.provider, block.url);
      if (!src) {
        return interactive ? null : (
          <span className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-bio-border px-6 text-center text-sm text-bio-fg-muted">
            <Icon name="file-code" className="text-2xl" />
            {t("embedPlaceholder")}
          </span>
        );
      }
      return (
        <div
          className={cn(
            "w-full overflow-hidden rounded-2xl border border-bio-border bg-bio-card",
            embedHeightClass(block.provider, src),
          )}
        >
          <iframe
            src={src}
            title={t("embedTitle", { provider: PROVIDER_NAMES[block.provider] ?? block.provider })}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="block size-full border-0"
          />
        </div>
      );
    }

    if (block.type === "form") {
      return (
        <BioFormCapture
          biopageId={page.id}
          blockId={block.id}
          mode={block.mode}
          title={block.title}
          buttonLabel={block.buttonLabel}
          whatsappNumber={block.whatsappNumber}
          successMessage={block.successMessage ?? ""}
          endpoint={formEndpoint ?? "/api/bio/leads"}
          interactive={interactive}
          buttonClass={buttonClass}
          buttonStyle={buttonStyle}
        />
      );
    }

    return <hr className="m-0 my-1 h-px w-full border-0 bg-bio-border" />;
  }

  return (
    <div
      className={cn(
        "relative w-full",
        embedded && "min-h-full",
        hasSideAds && page.adLeftImage && "lg:pl-56",
        hasSideAds && page.adRightImage && "lg:pr-56",
      )}
      data-bio-page={page.id}
    >
      {!embedded && page.adsEnabled && page.adLeftImage ? (
        <div className="fixed top-24 left-4 z-10 hidden w-44 overflow-hidden rounded-2xl lg:block">
          <Banner src={page.adLeftImage} href={page.adLeftHref ?? null} interactive={interactive} />
        </div>
      ) : null}
      {!embedded && page.adsEnabled && page.adRightImage ? (
        <div className="fixed top-24 right-4 z-10 hidden w-44 overflow-hidden rounded-2xl lg:block">
          <Banner src={page.adRightImage} href={page.adRightHref ?? null} interactive={interactive} />
        </div>
      ) : null}

      <div
        className={cn(
          `bio-theme-${page.theme}`,
          "relative flex w-full flex-col items-center bg-bio-bg text-bio-fg antialiased",
          themedBackground &&
            "bg-[radial-gradient(130%_60%_at_50%_0%,var(--bio-bg-alt)_0%,transparent_72%)]",
          embedded ? "min-h-full" : "min-h-dvh",
          className,
        )}
        style={rootStyle}
      >
        <div className="flex w-full max-w-[36rem] flex-col items-center px-5 pt-10 pb-8 sm:pt-14">
          {page.adsEnabled && page.adMobileImage ? (
            <div className={cn("mb-6 w-full overflow-hidden rounded-2xl", !embedded && "lg:hidden")}>
              <Banner src={page.adMobileImage} href={page.adMobileHref ?? null} interactive={interactive} />
            </div>
          ) : null}

          <header className="flex w-full flex-col items-center text-center">
            {page.coverUrl ? (
              <div className="aspect-[3/1] w-full overflow-hidden rounded-3xl border border-bio-border bg-bio-card">
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN */}
                <img src={page.coverUrl} alt="" className="block size-full object-cover" />
              </div>
            ) : null}

            <div className={cn("flex flex-col items-center", page.coverUrl && "-mt-12")}>
              {mode === "logo" && page.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN
                <img
                  src={page.logoUrl}
                  alt={page.displayName}
                  className={cn(
                    "block h-20 max-w-56 object-contain",
                    page.coverUrl && "rounded-2xl bg-bio-bg p-2 shadow-sm",
                  )}
                />
              ) : null}

              {mode === "text" ? (
                <span
                  className={cn(
                    "block text-[2.75rem] leading-none font-extrabold tracking-[-0.03em] break-words",
                    page.coverUrl && "rounded-2xl bg-bio-bg px-4 py-3",
                  )}
                  aria-hidden="true"
                >
                  {page.profileText || page.displayName}
                </span>
              ) : null}

              {mode === "photo" ? (
                page.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN
                  <img
                    src={page.avatarUrl}
                    alt=""
                    width={96}
                    height={96}
                    className="block size-24 rounded-full object-cover shadow-[0_4px_14px_-4px_rgb(0_0_0/0.25)] ring-4 ring-bio-bg"
                  />
                ) : (
                  <span
                    className="flex size-24 items-center justify-center rounded-full bg-bio-accent text-3xl font-bold tracking-tight text-bio-on-accent ring-4 ring-bio-bg"
                    aria-hidden="true"
                  >
                    {initials(page.displayName)}
                  </span>
                )
              ) : null}
            </div>

            <h1
              className={cn(
                "m-0 mt-4 max-w-full text-[1.625rem] leading-tight font-bold tracking-[-0.02em] break-words",
                mode === "text" && "sr-only",
              )}
            >
              {page.displayName}
            </h1>
            {page.bio ? (
              <p className="m-0 mt-2 max-w-[30rem] text-[15px] leading-relaxed break-words whitespace-pre-line text-bio-fg-muted">
                {page.bio}
              </p>
            ) : null}
          </header>

          {visibleBlocks.length > 0 ? (
            <div className="mt-8 flex w-full flex-col gap-3.5">
              {visibleBlocks.map((block, index) => {
                const rendered = renderBlock(block);
                if (rendered == null) {
                  return null;
                }
                const motion = entrance(index);
                return (
                  <div key={block.id} className={cn("w-full", motion.className)} style={motion.style}>
                    {rendered}
                  </div>
                );
              })}
            </div>
          ) : !interactive ? (
            <div className="mt-8 flex w-full flex-col gap-3.5" aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className="block h-14 w-full rounded-2xl border border-dashed border-bio-border opacity-70"
                />
              ))}
              <span className="text-center text-sm text-bio-fg-muted">{t("emptyPreview")}</span>
            </div>
          ) : null}

          {showBranding && branding ? (
            <a
              href={branding.href}
              className={cn(
                "mt-12 inline-flex items-center gap-1.5 rounded-full border border-bio-border bg-bio-card/70 px-3.5 py-1.5 text-xs font-medium text-bio-fg-muted no-underline backdrop-blur-sm transition-colors duration-150 hover:text-bio-fg hover:no-underline",
                FOCUS_RING,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("madeWith", { name: branding.name })}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
