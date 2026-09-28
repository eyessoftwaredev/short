import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Icon } from "@/components/kit/icon";
import { cn } from "@/lib/cx";
import { InfoTip } from "./info-tip";

type FieldProps = {
  label?: ReactNode;
  /** Explains what the setting does; shown in an "i" tooltip next to the label. */
  info?: ReactNode;
  /** One quiet line under the control: format, example, consequence. */
  hint?: ReactNode;
  /** Replaces the hint and turns it red. Pair with `aria-invalid` on the control. */
  error?: ReactNode;
  /** Adds a red asterisk after the label. The control still needs `required`. */
  required?: boolean;
  /** Muted marker after the label, e.g. `optional={t("common.optional")}`. */
  optional?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Label + control + hint/error, stacked. Wraps the control in a `<label>`, so
 * clicking the label focuses it without an `id`.
 *
 *   <Field label="Destination URL" info="Where visitors end up." hint="Must start with https://">
 *     <Input name="destination" />
 *   </Field>
 */
export function Field({ label, info, hint, error, required, optional, children, className }: FieldProps) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <span className="flex min-w-0 items-center gap-1.5 text-sm leading-5 font-medium text-ink">
          <span className="min-w-0">
            {label}
            {required ? (
              <span className="ml-0.5 text-danger" aria-hidden="true">
                *
              </span>
            ) : null}
          </span>
          {optional ? <span className="text-xs font-normal text-fg-subtle">{optional}</span> : null}
          {info ? (
            <InfoTip inline label={typeof label === "string" ? label : "Info"}>
              {info}
            </InfoTip>
          ) : null}
        </span>
      ) : null}
      {children}
      {hint && !error ? <span className="text-[13px] leading-5 text-fg-subtle">{hint}</span> : null}
      {error ? (
        <span role="alert" className="flex items-start gap-1.5 text-[13px] leading-5 text-danger">
          <Icon name="circle-xmark" className="mt-0.5 text-xs" />
          <span className="min-w-0">{error}</span>
        </span>
      ) : null}
    </label>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  /**
   * Rendered inside the field before the text — an icon, a unit, or a fixed
   * part of the value such as `https://` or `short.ky/`.
   */
  prefix?: ReactNode;
  /** Rendered inside the field after the text — a unit, a counter, a button. */
  suffix?: ReactNode;
  /** Classes for the outer box when `prefix`/`suffix` is used. */
  wrapperClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, prefix, suffix, wrapperClassName, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      className={cn(
        "min-w-0",
        (prefix != null || suffix != null) &&
          "min-h-0 flex-1 border-0 bg-transparent px-0 py-0 shadow-none hover:border-0 focus:shadow-none disabled:bg-transparent",
        className,
      )}
      // Password managers and mailbox extensions rewrite attributes on the
      // server markup before React hydrates. Without this, the tree mismatches.
      suppressHydrationWarning
      {...props}
    />
  );

  if (prefix == null && suffix == null) {
    return input;
  }

  return (
    <span
      className={cn(
        "flex h-9.5 min-w-0 items-center gap-2 rounded-default border border-border-strong bg-bg px-3 text-sm shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-border-hover focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--ring)] focus-within:hover:border-accent",
        props.disabled && "pointer-events-none bg-surface-subtle opacity-70",
        props["aria-invalid"] === true || props["aria-invalid"] === "true" ? "border-danger" : null,
        wrapperClassName,
      )}
    >
      {prefix != null ? (
        <span className="flex shrink-0 items-center text-fg-subtle select-none">{prefix}</span>
      ) : null}
      {input}
      {suffix != null ? (
        <span className="flex shrink-0 items-center text-fg-subtle select-none">{suffix}</span>
      ) : null}
    </span>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn("min-h-24 min-w-0 resize-y leading-5", className)} {...props} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select className={cn("min-w-0 cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}
