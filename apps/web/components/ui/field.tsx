import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cx";
import { InfoTip } from "./info-tip";

type FieldProps = {
  label?: ReactNode;
  /** Explains what the setting does; shown in an "i" tooltip next to the label. */
  info?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Field({ label, info, hint, error, children, className }: FieldProps) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <span className="min-w-0">{label}</span>
          {info ? (
            <InfoTip inline label={typeof label === "string" ? label : "Info"}>
              {info}
            </InfoTip>
          ) : null}
        </span>
      ) : null}
      {children}
      {hint && !error ? <span className="text-xs text-fg-subtle">{hint}</span> : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn("min-w-0", className)}
      // Password managers and mailbox extensions rewrite attributes on the
      // server markup before React hydrates. Without this, the tree mismatches.
      suppressHydrationWarning
      {...props}
    />
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn("min-h-24 min-w-0 resize-y", className)} {...props} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select className={cn("min-w-0", className)} {...props}>
      {children}
    </select>
  );
}
