import type { CSSProperties } from "react";
import type { BioBlock, BiopageFont, BiopageProfileMode, BiopageTheme } from "@short/core";
import { FONT_STACKS, sanitizeBioCss } from "@short/core";
import { Icon, type IconName } from "@/components/kit/icon";
import { cn } from "@/lib/cx";
import { BioFormCapture } from "./bio-form-capture";
import { socialHref, socialIcon, SOCIAL_LABELS } from "./bio-icons";

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
  showBranding?: boolean;
  branding?: { name: string; href: string };
  formEndpoint?: string;
  className?: string;
};

const BUTTON_STYLES: Record<string, string> = {
  solid: "rounded-default border border-bio-accent bg-bio-accent text-bio-on-accent",
  outline: "rounded-default border border-bio-accent bg-transparent text-bio-accent",
  soft: "rounded-default border border-bio-border bg-bio-card text-bio-fg",
  pill: "rounded-pill border border-bio-accent bg-bio-accent text-bio-on-accent",
};

const EMBED_ASPECT: Record<string, string> = {
  youtube: "aspect-video",
  vimeo: "aspect-video",
  spotify: "h-40",
};

/** Turns a watch/track page URL into the provider's embeddable player URL. */
function embedSrc(provider: string, url: string): string | null {
  try {
    const parsed = new URL(url);

    if (provider === "youtube") {
      const id =
        parsed.searchParams.get("v") ??
        (parsed.hostname.endsWith("youtu.be") ? parsed.pathname.slice(1) : null);
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }

    if (provider === "vimeo") {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : null;
    }

    if (provider === "spotify") {
      const segments = parsed.pathname.split("/").filter(Boolean);
      return segments.length >= 2 ? `https://open.spotify.com/embed/${segments.join("/")}` : null;
    }
  } catch {
    return null;
  }
  return null;
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
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
    <img src={src} alt="" className={cn("w-full object-cover", className)} />
  );
  if (href && interactive) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="block">
        {image}
      </a>
    );
  }
  return image;
}

export function BioPageView({
  page,
  interactive = true,
  showBranding = true,
  branding,
  formEndpoint,
  className,
}: BioPageViewProps) {
  const buttonClass = BUTTON_STYLES[page.buttonStyle] ?? BUTTON_STYLES.solid;
  const font = page.fontFamily ?? "sans";
  const mode = page.profileMode ?? "photo";
  const customCss = sanitizeBioCss(page.customCss ?? "");
  const rootStyle: CSSProperties = {
    fontFamily: FONT_STACKS[font],
    color: page.textColor ?? undefined,
    ...cssToStyle(customCss),
  };

  if (page.bgType === "color" && page.bgColor) {
    rootStyle.backgroundColor = page.bgColor;
  }
  if (page.bgType === "gradient" && page.bgGradient) {
    rootStyle.backgroundImage = page.bgGradient;
  }
  if (page.bgType === "image" && page.bgImageUrl) {
    rootStyle.backgroundImage = `url(${page.bgImageUrl})`;
    rootStyle.backgroundSize = "cover";
    rootStyle.backgroundPosition = "center";
  }

  const buttonStyle: CSSProperties | undefined =
    page.buttonColor || page.buttonTextColor
      ? {
          backgroundColor: page.buttonColor ?? undefined,
          borderColor: page.buttonColor ?? undefined,
          color: page.buttonTextColor ?? undefined,
        }
      : undefined;

  const hasSideAds =
    page.adsEnabled && Boolean(page.adLeftImage || page.adRightImage);

  return (
    <div
      className={cn(
        "relative w-full",
        hasSideAds && page.adLeftImage && "lg:pl-56",
        hasSideAds && page.adRightImage && "lg:pr-56",
      )}
      data-bio-page={page.id}
    >
      {page.adsEnabled && page.adLeftImage ? (
        <div className="fixed top-24 left-4 z-10 hidden w-44 lg:block">
          <Banner src={page.adLeftImage} href={page.adLeftHref ?? null} interactive={interactive} />
        </div>
      ) : null}
      {page.adsEnabled && page.adRightImage ? (
        <div className="fixed top-24 right-4 z-10 hidden w-44 lg:block">
          <Banner src={page.adRightImage} href={page.adRightHref ?? null} interactive={interactive} />
        </div>
      ) : null}

      <div
        className={cn(
          `bio-theme-${page.theme}`,
          "flex w-full flex-col items-center bg-bio-bg px-5 py-10 text-bio-fg",
          className,
        )}
        style={rootStyle}
      >
        {page.adsEnabled && page.adMobileImage ? (
          <div className="mb-4 w-full max-w-lg lg:hidden">
            <Banner src={page.adMobileImage} href={page.adMobileHref ?? null} interactive={interactive} />
          </div>
        ) : null}

        <div className="flex w-full max-w-lg flex-col items-center gap-6">
          <header className="flex w-full flex-col items-center gap-3 text-center">
            {page.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN
              <img
                src={page.coverUrl}
                alt=""
                className="-mb-16 h-36 w-full rounded-default object-cover"
              />
            ) : null}

            {mode === "logo" && page.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN
              <img
                src={page.logoUrl}
                alt={page.displayName}
                className="h-16 max-w-48 object-contain"
              />
            ) : null}

            {mode === "text" ? (
              <span className="text-4xl font-semibold tracking-tight">
                {page.profileText || page.displayName}
              </span>
            ) : null}

            {mode === "photo" ? (
              page.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN
                <img
                  src={page.avatarUrl}
                  alt={page.displayName}
                  width={96}
                  height={96}
                  className="size-24 rounded-pill border border-bio-border object-cover"
                />
              ) : (
                <span className="flex size-24 items-center justify-center rounded-pill border border-bio-border bg-bio-card text-2xl font-semibold">
                  {initials(page.displayName)}
                </span>
              )
            ) : null}

            {mode !== "text" ? (
              <h1 className="m-0 text-2xl font-semibold tracking-tight">{page.displayName}</h1>
            ) : (
              <h1 className="sr-only">{page.displayName}</h1>
            )}
            {page.bio ? (
              <p className="m-0 max-w-prose text-sm leading-relaxed text-bio-fg-muted">{page.bio}</p>
            ) : null}
          </header>

          <div className="flex w-full flex-col gap-3">
            {page.blocks.map((block) => {
              if (block.visible === false) {
                return null;
              }

              if (block.type === "link") {
                const content = (
                  <>
                    {block.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN
                      <img
                        src={block.iconUrl}
                        alt=""
                        width={24}
                        height={24}
                        className="size-6 shrink-0 rounded-xs object-cover"
                      />
                    ) : block.iconName ? (
                      <Icon name={block.iconName as IconName} className="text-lg" />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{block.label}</span>
                  </>
                );

                const classes = cn(
                  "flex w-full items-center gap-3 px-5 py-3.5 text-center text-base font-medium no-underline transition duration-200 hover:no-underline",
                  buttonClass,
                  block.highlighted && "shadow-lift",
                  interactive && "hover:-translate-y-0.5",
                );
                const newTab = block.newTab !== false;

                return interactive ? (
                  <a
                    key={block.id}
                    href={block.destination}
                    className={classes}
                    style={buttonStyle}
                    target={newTab ? "_blank" : undefined}
                    rel={newTab ? "noopener noreferrer nofollow" : "nofollow"}
                    data-bio-block={block.id}
                  >
                    {content}
                  </a>
                ) : (
                  <span key={block.id} className={classes} style={buttonStyle}>
                    {content}
                  </span>
                );
              }

              if (block.type === "social") {
                return (
                  <div key={block.id} className="flex flex-wrap justify-center gap-2.5 py-1">
                    {block.items.map((item) => {
                      const mark = socialIcon(item.platform);
                      const label = SOCIAL_LABELS[item.platform] ?? item.platform;
                      const classes =
                        "flex size-11 items-center justify-center rounded-pill border border-bio-border bg-bio-card text-bio-fg no-underline transition duration-200 hover:border-bio-accent hover:text-bio-accent";

                      return interactive ? (
                        <a
                          key={`${item.platform}-${item.url}`}
                          href={socialHref(item.platform, item.url)}
                          aria-label={label}
                          title={label}
                          className={classes}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          data-bio-block={block.id}
                        >
                          <Icon name={mark} className="text-lg" />
                        </a>
                      ) : (
                        <span
                          key={`${item.platform}-${item.url}`}
                          aria-label={label}
                          title={label}
                          className={classes}
                        >
                          <Icon name={mark} className="text-lg" />
                        </span>
                      );
                    })}
                  </div>
                );
              }

              if (block.type === "header") {
                return (
                  <h2
                    key={block.id}
                    className="m-0 pt-3 text-center font-mono text-xs tracking-widest text-bio-fg-muted uppercase"
                  >
                    {block.text}
                  </h2>
                );
              }

              if (block.type === "text") {
                return (
                  <p
                    key={block.id}
                    className={cn(
                      "m-0 text-sm leading-relaxed whitespace-pre-line text-bio-fg-muted",
                      block.align === "left" ? "text-left" : "text-center",
                    )}
                  >
                    {block.body}
                  </p>
                );
              }

              if (block.type === "image") {
                const image = (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN
                  <img
                    src={block.url}
                    alt={block.alt}
                    className="w-full rounded-default border border-bio-border object-cover"
                  />
                );

                return block.href && interactive ? (
                  <a
                    key={block.id}
                    href={block.href}
                    className="block no-underline"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    data-bio-block={block.id}
                  >
                    {image}
                  </a>
                ) : (
                  <div key={block.id}>{image}</div>
                );
              }

              if (block.type === "embed") {
                const src = embedSrc(block.provider, block.url);
                if (!src) {
                  return null;
                }
                return (
                  <div
                    key={block.id}
                    className={cn(
                      "w-full overflow-hidden rounded-default border border-bio-border",
                      EMBED_ASPECT[block.provider] ?? "aspect-video",
                    )}
                  >
                    <iframe
                      src={src}
                      title={block.provider}
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="size-full border-0"
                    />
                  </div>
                );
              }

              if (block.type === "form") {
                return (
                  <BioFormCapture
                    key={block.id}
                    biopageId={page.id}
                    blockId={block.id}
                    mode={block.mode}
                    title={block.title}
                    buttonLabel={block.buttonLabel}
                    whatsappNumber={block.whatsappNumber}
                    successMessage={block.successMessage ?? ""}
                    endpoint={formEndpoint ?? "/api/bio/leads"}
                    interactive={interactive}
                  />
                );
              }

              return <hr key={block.id} className="my-2 w-full border-0 border-t border-bio-border" />;
            })}
          </div>

          {showBranding && branding ? (
            <a
              href={branding.href}
              className="mt-4 font-mono text-xs text-bio-fg-muted no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {branding.name}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

