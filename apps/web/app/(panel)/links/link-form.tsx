"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import type { AbVariant } from "@short/core";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  Field,
  Grid,
  Input,
  SaveBar,
  Section,
  Select,
  Sheet,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
  type TabItem,
} from "@/components/ui";
import { linkFormSchema, type LinkFormValues } from "@/lib/link-form";
import { createLinkAction, updateLinkAction, type SavedLink } from "./actions";
import { RuleBuilder } from "./rule-builder";

export type DomainOption = { id: string; hostname: string };
export type FolderOption = { id: string; name: string };

type TabId = "basics" | "targeting" | "campaign" | "advanced";

const TABS: TabItem<TabId>[] = [
  { id: "basics", label: "Basics" },
  { id: "targeting", label: "Targeting" },
  { id: "campaign", label: "Campaign" },
  { id: "advanced", label: "Advanced" },
];

type LinkFormProps = {
  mode: "create" | "edit";
  linkId?: string;
  defaultValues: LinkFormValues;
  domains: DomainOption[];
  folders: FolderOption[];
  /** Plan gates; the UI explains the limit instead of failing on submit. */
  canTarget: boolean;
  canAbTest: boolean;
  canProtect: boolean;
  canCloak: boolean;
  hasPassword?: boolean;
};

export function LinkForm({
  mode,
  linkId,
  defaultValues,
  domains,
  folders,
  canTarget,
  canAbTest,
  canProtect,
  canCloak,
  hasPassword = false,
}: LinkFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("basics");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [saved, setSaved] = useState<SavedLink | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues,
  });

  const values = watch();
  const selectedDomain = useMemo(
    () => domains.find((domain) => domain.id === values.domainId) ?? domains[0],
    [domains, values.domainId],
  );

  const previewUrl = selectedDomain
    ? `https://${selectedDomain.hostname}/${values.slug || "auto-generated"}`
    : "";

  const onSubmit = handleSubmit(async (formValues) => {
    setFormError(null);
    const result =
      mode === "create"
        ? await createLinkAction(formValues)
        : await updateLinkAction(linkId ?? "", formValues);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setSaved(result.data);
    if (mode === "create") {
      router.push(`/links/${result.data.id}`);
      return;
    }
    reset(formValues);
    router.refresh();
  });

  const addVariant = (): void => {
    const next: AbVariant = { id: crypto.randomUUID(), destination: "", weight: 50 };
    setValue("abVariants", [...values.abVariants, next], { shouldDirty: true });
  };

  return (
    <form
      className="flex min-w-0 flex-col gap-6"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <Tabs items={TABS} value={tab} onChange={setTab} />

      <TabPanel active={tab === "basics"}>
        <div className="flex flex-col gap-4">
          <Field
            label="Destination URL"
            error={errors.destination?.message}
            hint="Where visitors land when no rule matches"
          >
            <Input placeholder="https://acme.com/campaign" {...register("destination")} />
          </Field>

          <Grid columns={2}>
            <Field label="Domain" error={errors.domainId?.message}>
              <Select {...register("domainId")}>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.hostname}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Short link"
              error={errors.slug?.message}
              hint="Leave empty to generate one"
            >
              <Input placeholder="spring-sale" {...register("slug")} />
            </Field>
          </Grid>

          {previewUrl ? (
            <Card staticHover className="flex-row items-center justify-between gap-3">
              <span className="min-w-0 truncate font-mono text-sm">{previewUrl}</span>
              <div className="flex shrink-0 items-center gap-1">
                <CopyButton value={previewUrl} iconOnly />
                {mode === "edit" ? (
                  <Button
                    variant="ghost"
                    icon
                    aria-label="Open short link"
                    onClick={() => window.open(previewUrl, "_blank", "noreferrer")}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Grid columns={2}>
            <Field label="Title" hint="Used for previews and cloaked pages">
              <Input {...register("title")} />
            </Field>
            <Field label="Folder">
              <Select {...register("folderId")}>
                <option value="">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </Select>
            </Field>
          </Grid>

          <Field label="Description">
            <Textarea rows={3} {...register("description")} />
          </Field>

          <Grid columns={2}>
            <Field label="Preview image URL">
              <Input placeholder="https://acme.com/og.png" {...register("image")} />
            </Field>
            <Field label="Tags" hint="Comma separated">
              <Input placeholder="campaign, q4" {...register("tagsText")} />
            </Field>
          </Grid>
        </div>
      </TabPanel>

      <TabPanel active={tab === "targeting"}>
        <div className="flex flex-col gap-6">
          <Section
            title="Targeting rules"
            description={
              values.rules.length === 0
                ? "Everyone goes to the default destination."
                : `${values.rules.length} rule${values.rules.length === 1 ? "" : "s"} configured.`
            }
            actions={
              <Button variant="primary" onClick={() => setRulesOpen(true)}>
                <SlidersHorizontal className="size-4" />
                Configure rules
              </Button>
            }
          >
            <div className="flex flex-wrap gap-2">
              {values.rules.map((rule) => (
                <Badge key={rule.id} tone="muted">
                  #{rule.priority} → {rule.destination || "not set"}
                </Badge>
              ))}
            </div>
          </Section>

          <Section
            title="Deep links"
            description="Send app users straight into the native app when the OS matches."
          >
            <Grid columns={2}>
              <Field label="iOS destination">
                <Input placeholder="myapp://product/42" {...register("iosDestination")} />
              </Field>
              <Field label="Android destination">
                <Input placeholder="myapp://product/42" {...register("androidDestination")} />
              </Field>
            </Grid>
          </Section>

          <Section
            title="A/B test"
            description={
              canAbTest
                ? "Traffic is split deterministically, so a visitor always sees the same variant."
                : "A/B testing requires the Pro plan."
            }
            actions={
              canAbTest ? (
                <Button size="sm" onClick={addVariant}>
                  <Plus className="size-4" />
                  Add variant
                </Button>
              ) : null
            }
          >
            <div className="flex flex-col gap-3">
              {values.abVariants.map((variant, index) => (
                <div key={variant.id} className="flex items-end gap-2">
                  <Field label={`Variant ${index + 1}`} className="flex-1">
                    <Input
                      value={variant.destination}
                      placeholder="https://acme.com/variant-b"
                      onChange={(event) =>
                        setValue(
                          "abVariants",
                          values.abVariants.map((item, position) =>
                            position === index
                              ? { ...item, destination: event.target.value }
                              : item,
                          ),
                          { shouldDirty: true },
                        )
                      }
                    />
                  </Field>
                  <Field label="Weight" className="w-24">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={variant.weight}
                      onChange={(event) =>
                        setValue(
                          "abVariants",
                          values.abVariants.map((item, position) =>
                            position === index
                              ? { ...item, weight: Number(event.target.value) || 0 }
                              : item,
                          ),
                          { shouldDirty: true },
                        )
                      }
                    />
                  </Field>
                  <Button
                    variant="ghost"
                    icon
                    aria-label="Remove variant"
                    onClick={() =>
                      setValue(
                        "abVariants",
                        values.abVariants.filter((_, position) => position !== index),
                        { shouldDirty: true },
                      )
                    }
                  >
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </div>
              ))}
              {values.abVariants.length === 1 ? (
                <p className="m-0 text-sm text-danger">An A/B test needs at least two variants.</p>
              ) : null}
            </div>
          </Section>
        </div>
      </TabPanel>

      <TabPanel active={tab === "campaign"}>
        <div className="flex flex-col gap-4">
          <p className="m-0 text-sm text-fg-muted">
            These parameters are appended to the destination. Values arriving on the short link
            itself override them.
          </p>
          <Grid columns={2}>
            <Field label="utm_source">
              <Input placeholder="newsletter" {...register("utmSource")} />
            </Field>
            <Field label="utm_medium">
              <Input placeholder="email" {...register("utmMedium")} />
            </Field>
            <Field label="utm_campaign">
              <Input placeholder="spring-sale" {...register("utmCampaign")} />
            </Field>
            <Field label="utm_term">
              <Input {...register("utmTerm")} />
            </Field>
            <Field label="utm_content">
              <Input {...register("utmContent")} />
            </Field>
          </Grid>

          <Card staticHover className="flex-row items-center justify-between gap-4">
            <span className="min-w-0">
              <span className="block text-sm font-medium">Forward query parameters</span>
              <span className="block text-sm text-fg-muted">
                Pass any extra parameters from the short link through to the destination.
              </span>
            </span>
            <Switch
              checked={values.forwardQuery}
              onCheckedChange={(checked) =>
                setValue("forwardQuery", checked, { shouldDirty: true })
              }
            />
          </Card>
        </div>
      </TabPanel>

      <TabPanel active={tab === "advanced"}>
        <div className="flex flex-col gap-4">
          <Grid columns={2}>
            <Field label="Expires at" error={errors.expiresAt?.message}>
              <Input type="datetime-local" {...register("expiresAt")} />
            </Field>
            <Field label="Destination after expiry">
              <Input placeholder="https://acme.com/expired" {...register("expiredDestination")} />
            </Field>
          </Grid>

          <Field
            label="Password"
            hint={
              !canProtect
                ? "Password protection requires the Pro plan."
                : hasPassword
                  ? "Leave empty to keep the current password, or enter - to remove it."
                  : "Visitors must enter this before being redirected."
            }
          >
            <Input type="password" disabled={!canProtect} {...register("password")} />
          </Field>

          <Card staticHover className="flex-row items-center justify-between gap-4">
            <span className="min-w-0">
              <span className="block text-sm font-medium">Cloak the destination</span>
              <span className="block text-sm text-fg-muted">
                {canCloak
                  ? "Renders the destination in a frame so the short URL stays in the address bar."
                  : "Cloaking requires the Business plan."}
              </span>
            </span>
            <Switch
              checked={values.cloaked}
              disabled={!canCloak}
              onCheckedChange={(checked) => setValue("cloaked", checked, { shouldDirty: true })}
            />
          </Card>

          <Card staticHover className="flex-row items-center justify-between gap-4">
            <span className="min-w-0">
              <span className="block text-sm font-medium">Discourage search engines</span>
              <span className="block text-sm text-fg-muted">
                Sends <code className="font-mono text-xs">noindex, nofollow</code> on the redirect.
              </span>
            </span>
            <Switch
              checked={values.noIndex}
              onCheckedChange={(checked) => setValue("noIndex", checked, { shouldDirty: true })}
            />
          </Card>

          {mode === "edit" ? (
            <Card staticHover className="flex-row items-center justify-between gap-4">
              <span className="min-w-0">
                <span className="block text-sm font-medium">Archive</span>
                <span className="block text-sm text-fg-muted">
                  Archived links stop redirecting and fall back to the domain&apos;s not-found URL.
                </span>
              </span>
              <Switch
                checked={values.archived}
                onCheckedChange={(checked) => setValue("archived", checked, { shouldDirty: true })}
              />
            </Card>
          ) : null}

          <Field label="Internal notes">
            <Textarea rows={3} {...register("comments")} />
          </Field>
        </div>
      </TabPanel>

      {formError ? <p className="m-0 text-sm text-danger">{formError}</p> : null}
      {saved && mode === "edit" ? (
        <p className="m-0 text-sm text-accent-hover">Saved. The edge is already serving it.</p>
      ) : null}

      <SaveBar
        dirty={isDirty || mode === "create"}
        saving={isSubmitting}
        message={mode === "create" ? "Ready to create" : "Unsaved changes"}
        actions={
          <>
            <Button size="sm" onClick={() => reset(defaultValues)} disabled={isSubmitting}>
              Discard
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : mode === "create" ? "Create link" : "Save changes"}
            </Button>
          </>
        }
      />

      <Sheet
        open={rulesOpen}
        side="right"
        size="lg"
        title="Targeting rules"
        description="Route visitors by geography, device, language, referrer or schedule."
        onClose={() => setRulesOpen(false)}
        footer={
          <Button variant="primary" onClick={() => setRulesOpen(false)}>
            Done
          </Button>
        }
      >
        <RuleBuilder
          rules={values.rules}
          disabled={!canTarget}
          onChange={(rules) => setValue("rules", rules, { shouldDirty: true })}
        />
      </Sheet>
    </form>
  );
}
