"use client";

import { Icon, type IconName } from "@/components/kit/icon";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";

/**
 * `default` and `secondary` are the same neutral, bordered button — `secondary`
 * is the name the design guide uses; `default` is kept for existing call sites.
 */
type ButtonVariant = "default" | "secondary" | "primary" | "ghost" | "danger" | "cloudflare";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square, icon-only button. Always pair with `aria-label`. */
  icon?: boolean;
  /** Glyph before the label, e.g. `leadingIcon="plus"`. Replaced by the spinner while loading. */
  leadingIcon?: IconName;
  /** Glyph after the label, e.g. a chevron on a menu trigger. */
  trailingIcon?: IconName;
  /** Renders an anchor instead of a button, so server components can link without a handler. */
  href?: string;
  /** Opens in a new tab and applies the matching `rel`. Only meaningful with `href`. */
  external?: boolean;
  /** Native download filename. Renders a real `<a>` so Next Link does not swallow it. */
  download?: string;
  /**
   * Swaps the leading glyph for a spinner and blocks input. The button keeps
   * its width so a row of actions does not reflow mid-submit.
   */
  loading?: boolean;
  /** Stretches to the container, e.g. inside a narrow sheet or an empty state. */
  block?: boolean;
  children?: ReactNode;
};

const neutral =
  "border-border-strong bg-bg text-ink shadow-xs hover:border-border-hover hover:bg-surface-subtle active:bg-surface";

const variantClasses: Record<ButtonVariant, string> = {
  default: neutral,
  secondary: neutral,
  primary:
    "border-transparent bg-accent text-on-accent shadow-xs hover:bg-accent-hover active:bg-accent-hover",
  ghost:
    "border-transparent bg-transparent text-fg-muted hover:bg-surface hover:text-ink active:bg-surface-strong",
  danger:
    "border-danger-border bg-danger-surface text-danger hover:border-danger hover:bg-danger hover:text-on-accent",
  cloudflare:
    "border-transparent bg-cloudflare text-on-cloudflare shadow-xs hover:bg-cloudflare-hover",
};

/** Heights: 32 / 38 / 44px. `md` matches the text-input height. */
const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-default px-3 text-[13px]",
  md: "h-9.5 gap-2 rounded-default px-3.5 text-sm",
  lg: "h-11 gap-2 rounded-md px-5 text-[15px]",
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: "size-8 rounded-default p-0",
  md: "size-9.5 rounded-default p-0",
  lg: "size-11 rounded-md p-0",
};

const glyphSize: Record<ButtonSize, string> = {
  sm: "text-xs",
  md: "text-[13px]",
  lg: "text-sm",
};

export function Button({
  variant = "default",
  size = "md",
  icon = false,
  leadingIcon,
  trailingIcon,
  href,
  external = false,
  download,
  loading = false,
  block = false,
  className,
  children,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center border font-medium whitespace-nowrap no-underline transition-colors duration-150 select-none hover:no-underline disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variantClasses[variant],
    icon ? iconSizeClasses[size] : sizeClasses[size],
    block && "w-full",
    // A pending action must not keep offering a hover it will not honour.
    loading && "pointer-events-none opacity-80",
    className,
  );

  const spinner = <Icon name="spinner" className={glyphSize[size]} />;
  const lead = leadingIcon ? <Icon name={leadingIcon} className={glyphSize[size]} /> : null;
  const trail = trailingIcon ? (
    <Icon name={trailingIcon} className={cn(glyphSize[size], "opacity-70")} />
  ) : null;

  // An icon-only button has no room for a spinner beside its glyph, so the
  // spinner takes the glyph's place instead of crowding it.
  const content = loading ? (
    icon ? (
      spinner
    ) : (
      <>
        {spinner}
        {children}
        {trail}
      </>
    )
  ) : (
    <>
      {lead}
      {children}
      {trail}
    </>
  );

  if (href) {
    const anchorProps: AnchorHTMLAttributes<HTMLAnchorElement> = external
      ? { target: "_blank", rel: "noreferrer noopener" }
      : {};

    if (download) {
      return (
        <a
          href={href}
          download={download}
          className={classes}
          aria-label={props["aria-label"]}
          aria-disabled={loading || disabled || undefined}
          title={props.title}
          {...anchorProps}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        href={href}
        className={classes}
        aria-label={props["aria-label"]}
        aria-disabled={loading || disabled || undefined}
        title={props.title}
        {...anchorProps}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
}
