"use client";

import { Icon } from "@/components/kit/icon";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";

type ButtonVariant = "default" | "primary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: boolean;
  /** Renders an anchor instead of a button, so server components can link without a handler. */
  href?: string;
  /** Opens in a new tab and applies the matching `rel`. Only meaningful with `href`. */
  external?: boolean;
  /**
   * Swaps the leading glyph for a spinner and blocks input. The button keeps
   * its width so a row of actions does not reflow mid-submit.
   */
  loading?: boolean;
  /** Stretches to the container, e.g. inside a narrow sheet or an empty state. */
  block?: boolean;
  children?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "border-border-strong bg-bg text-ink hover:bg-surface hover:-translate-y-px",
  primary:
    "border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover hover:-translate-y-px",
  ghost: "border-transparent bg-transparent hover:bg-surface hover:-translate-y-px",
  danger:
    "border-danger bg-danger-surface text-danger hover:border-danger-hover hover:bg-danger hover:text-on-accent hover:-translate-y-px",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

const spinnerSize: Record<ButtonSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
};

export function Button({
  variant = "default",
  size = "md",
  icon = false,
  href,
  external = false,
  loading = false,
  block = false,
  className,
  children,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-default border font-medium whitespace-nowrap no-underline transition duration-200 hover:no-underline disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    icon ? "size-9 p-0" : sizeClasses[size],
    block && "w-full",
    // A pending action must not keep offering a hover lift it will not honour.
    loading && "pointer-events-none opacity-70",
    className,
  );

  const spinner = <Icon name="spinner" className={spinnerSize[size]} />;
  // An icon-only button has no room for a spinner beside its glyph, so the
  // spinner takes the glyph's place instead of crowding it.
  const content = loading ? (
    icon ? (
      spinner
    ) : (
      <>
        {spinner}
        {children}
      </>
    )
  ) : (
    children
  );

  if (href) {
    const anchorProps: AnchorHTMLAttributes<HTMLAnchorElement> = external
      ? { target: "_blank", rel: "noreferrer noopener" }
      : {};

    return (
      <Link
        href={href}
        className={classes}
        aria-label={props["aria-label"]}
        aria-disabled={loading || undefined}
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
