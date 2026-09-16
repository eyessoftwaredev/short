"use client";

import { Icon } from "@/components/kit/icon";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveLandingDraft } from "./actions";

type ShortenFormProps = {
  placeholder: string;
  submit: string;
};

export function ShortenForm({ placeholder, submit }: ShortenFormProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (pending) {
      return;
    }
    setPending(true);
    try {
      const result = await saveLandingDraft(value);
      router.push(result.href);
    } catch {
      router.push("/register");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="landing-shorten"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <Icon name="link" className="text-sm shrink-0 text-fg-subtle" aria-hidden="true" />
      <input
        type="url"
        name="url"
        value={value}
        placeholder={placeholder}
        autoComplete="url"
        disabled={pending}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
      <button type="submit" className="kit-btn kit-btn--primary" disabled={pending}>
        {submit}
        <Icon name="arrow-right" className="text-sm" aria-hidden="true" />
      </button>
    </form>
  );
}
