import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cx";

type AvatarProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  size?: "md" | "lg";
};

export function Avatar({ children, size = "md", className, ...props }: AvatarProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-inverse font-medium text-on-inverse transition duration-200 hover:-translate-y-0.5",
        size === "md" ? "size-8 text-xs" : "size-11 text-base",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
