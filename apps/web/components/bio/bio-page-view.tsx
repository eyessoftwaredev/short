import type { BioBlock, BiopageTheme } from "@short/core";
import { Icon } from "@/components/kit/icon";
import { cn } from "@/lib/cx";
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
};

type BioPageViewProps = {
  page: BioPageData;
  /** The builder preview renders inert blocks; the public page renders real anchors. */
  interactive?: boolean;
  showBranding?: boolean;
  branding?: { name: string; href: string };
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function BioPageView({
  page,
  interactive = true,
  showBranding = true,
  branding,
  className,
}: BioPageViewProps) {
  const buttonClass = BUTTON_STYLES[page.buttonStyle] ?? BUTTON_STYLES.solid;

  return (
    <div
      className={cn(
        `bio-theme-${page.theme}`,
        "flex min-h-full w-full flex-col items-center bg-bio-bg px-5 py-10 text-bio-fg",
        className,
      )}
      data-bio-page={page.id}
    >
      <div className="flex w-full max-w-lg flex-col items-center gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          {page.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary customer CDN, no loader config
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
          )}
          <h1 className="m-0 text-2xl font-semibold tracking-tight">{page.displayName}</h1>
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

              return interactive ? (
                <a
                  key={block.id}
                  href={block.destination}
                  className={classes}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  data-bio-block={block.id}
                >
                  {content}
                </a>
              ) : (
                <span key={block.id} className={classes}>
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
  );
}
