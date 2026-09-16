import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cx";

type FieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? <span className="text-sm font-medium">{label}</span> : null}
      {children}
      {hint && !error ? <span className="text-xs text-fg-subtle">{hint}</span> : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn("min-w-0", className)}
      // Password managers and mailbox extensions rewrite attributes on the
      // server markup before React hydrates. Without this, the tree mismatches.
      suppressHydrationWarning
      {...props}
    />
  );
}

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
