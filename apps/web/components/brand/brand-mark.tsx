import Link from "next/link";
import { cn } from "@/lib/cx";

type BrandMarkProps = {
  name: string;
  /** Inverse rail uses the light-on-dark mark when one is uploaded. */
  invert?: boolean;
  className?: string;
};

export function BrandMark({ name, invert = false, className }: BrandMarkProps) {
  const src = invert ? "/api/brand/logo_dark" : "/api/brand/logo";

  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-default",
        invert ? "bg-on-inverse-soft" : "bg-inverse",
        className,
      )}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- brand bytes are served from our API */}
      <img src={src} alt="" className="size-full object-contain" />
    </span>
  );
}

export function BrandLockup({
  name,
  invert = false,
  href = "/",
}: {
  name: string;
  invert?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 no-underline hover:no-underline",
        invert ? "text-on-inverse" : "text-ink",
      )}
    >
      <BrandMark name={name} invert={invert} />
      <span className="truncate text-base font-semibold tracking-tight">{name}</span>
    </Link>
  );
}
