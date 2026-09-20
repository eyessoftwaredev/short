import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cx";
import { Input } from "./field";

type SecretInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "autoComplete" | "name"> & {
  /** DOM name kept away from `password` so browsers skip login autofill. */
  domName?: string;
  /** When true, the field starts read-only until focused — blocks Chrome autofill. */
  blockAutofill?: boolean;
};

export function SecretInput({
  domName = "panel-secret",
  blockAutofill = true,
  className,
  readOnly,
  onFocus,
  ...props
}: SecretInputProps) {
  const startsReadOnly = blockAutofill && readOnly !== false;

  return (
    <Input
      type="password"
      name={domName}
      autoComplete="new-password"
      data-1p-ignore="true"
      data-lpignore="true"
      data-form-type="other"
      readOnly={startsReadOnly ? true : readOnly}
      onFocus={(event) => {
        if (event.currentTarget.readOnly && blockAutofill) {
          event.currentTarget.readOnly = false;
        }
        onFocus?.(event);
      }}
      className={cn(className)}
      {...props}
    />
  );
}
