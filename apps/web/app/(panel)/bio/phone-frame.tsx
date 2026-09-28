import type { ReactNode } from "react";
import { cn } from "@/lib/cx";

type PhoneFrameProps = {
  children: ReactNode;
  /** Height of the screen; the page scrolls inside it like on a real phone. */
  screenClassName?: string;
  className?: string;
  label?: string;
};

/**
 * A realistic phone around the live bio preview: dark bezel in both panel themes,
 * a camera island, and a scrollable screen, so people judge the page at phone size.
 */
export function PhoneFrame({ children, screenClassName, className, label }: PhoneFrameProps) {
  return (
    <figure
      className={cn(
        "relative m-0 mx-auto w-full max-w-[20rem] rounded-[2.75rem] bg-inverse p-2.5 shadow-pop ring-1 ring-border-strong",
        className,
      )}
      aria-label={label}
    >
      <span
        className="pointer-events-none absolute top-4.5 left-1/2 z-10 h-5 w-[5.5rem] -translate-x-1/2 rounded-full bg-inverse"
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative h-[36rem] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[2.25rem] bg-bg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          screenClassName,
        )}
      >
        {children}
      </div>
    </figure>
  );
}
