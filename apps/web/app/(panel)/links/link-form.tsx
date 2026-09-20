"use client";

import { Icon } from "@/components/kit/icon";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  SecretInput,
  Section,
  Select,
  Sheet,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
  type TabItem,
} from "@/components/ui";
import { ImageUpload } from "@/components/media/image-upload";
import { useActionMessage } from "@/lib/action-message";
import { linkFormSchema, type LinkFormValues } from "@/lib/link-form";
import { createLinkAction, updateLinkAction, type SavedLink } from "./actions";
import { RuleBuilder } from "./rule-builder";

export type DomainOption = { id: string; hostname: string };
export type FolderOption = { id: string; name: string };

type TabId = "basics" | "targeting" | "campaign" | "advanced";

function fieldError(
  message: string | undefined,
  t: ReturnType<typeof useTranslations>,
): string | undefined {
  if (!message) {
    return undefined;
  }
  if (
    message === "pickDomain" ||
    message === "destinationRequired" ||
    message === "slugPattern" ||
    message === "slugReserved"
  ) {
    return t(message);
  }
  return message;
}

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
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const router = useRouter();
  const actionMessage = useActionMessage();
  const [tab, setTab] = useState<TabId>("basics");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [saved, setSaved] = useState<SavedLink | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const tabs: TabItem<TabId>[] = [
    { id: "basics", label: t("tabBasics") },
    { id: "targeting", label: t("tabTargeting") },
    { id: "campaign", label: t("tabCampaign") },
    { id: "advanced", label: t("tabAdvanced") },
  ];

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

  const passwordField = register("password");
  const values = watch();
  const selectedDomain = useMemo(
    () => domains.find((domain) => domain.id === values.domainId) ?? domains[0],
    [domains, values.domainId],
  );

  const previewUrl = selectedDomain
    ? `https://${selectedDomain.hostname}/${values.slug || t("slugAuto")}`
    : "";

  const onSubmit = handleSubmit(async (formValues) => {
    setFormError(null);
    try {
      const result =
        mode === "create"
          ? await createLinkAction(formValues)
          : await updateLinkAction(linkId ?? "", formValues);

      if (!result.ok) {
        setFormError(actionMessage(result.error));
        return;
      }

      setSaved(result.data);
      if (mode === "create") {
        router.push(`/links/${result.data.id}`);
        return;
      }
      reset(formValues);
      router.refresh();
    } catch {
      setFormError(actionMessage("generic"));
    }
  });

  const addVariant = (): void => {
    const next: AbVariant = { id: crypto.randomUUID(), destination: "", weight: 50 };
    setValue("abVariants", [...values.abVariants, next], { shouldDirty: true });
  };

  return (
    <form
      className="flex min-w-0 flex-col gap-6"
      autoComplete="off"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <Tabs items={tabs} value={tab} onChange={setTab} />

      <TabPanel active={tab === "basics"}>
        <div className="flex flex-col gap-4">
          <Field
            label={t("destination")}
            error={fieldError(errors.destination?.message, t)}
            hint={t("destinationHint")}
          >
            <Input
              placeholder={t("destinationPlaceholder")}
              autoComplete="off"
              {...register("destination")}
            />
          </Field>

          <Grid columns={2}>
            <Field label={t("domain")} error={fieldError(errors.domainId?.message, t)}>
              <Select {...register("domainId")}>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.hostname}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("shortLink")} error={errors.slug?.message} hint={t("slugHint")}>
              <Input placeholder={t("slugPlaceholder")} {...register("slug")} />
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
                    aria-label={t("openShortLink")}
                    onClick={() => window.open(previewUrl, "_blank", "noreferrer")}
                  >
                    <Icon name="external-link" className="text-sm" />
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Grid columns={2}>
            <Field label={t("titleField")} hint={t("titleHint")}>
              <Input {...register("title")} />
            </Field>
            <Field label={t("folder")}>
              <Select {...register("folderId")}>
                <option value="">{t("noFolder")}</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </Select>
            </Field>
          </Grid>

          <Field label={t("descriptionField")}>
            <Textarea rows={3} {...register("description")} />
          </Field>

          <Grid columns={2}>
            <Field label={t("previewImage")}>
              <ImageUpload
                value={values.image}
                onChange={(url) => setValue("image", url, { shouldDirty: true })}
              />
            </Field>
            <Field label={t("tags")} hint={t("tagsHint")}>
              <Input placeholder={t("tagsPlaceholder")} {...register("tagsText")} />
            </Field>
          </Grid>
        </div>
      </TabPanel>

      <TabPanel active={tab === "targeting"}>
        <div className="flex flex-col gap-6">
          <Section
            title={t("targetingRules")}
            description={
              !canTarget
                ? t("targetingPaywall")
                : values.rules.length === 0
                  ? t("rulesEmpty")
                  : t("rulesCount", { count: values.rules.length })
            }
            actions={
              canTarget ? (
                <Button variant="primary" onClick={() => setRulesOpen(true)}>
                  <Icon name="sliders" className="text-sm" />
                  {t("configureRules")}
                </Button>
              ) : values.rules.length > 0 ? (
                <Button
                  onClick={() => setValue("rules", [], { shouldDirty: true })}
                >
                  {t("clearRules")}
                </Button>
              ) : null
            }
          >
            <div className="flex flex-wrap gap-2">
              {values.rules.map((rule) => (
                <Badge key={rule.id} tone="muted">
                  {t("ruleBadge", {
                    priority: rule.priority,
                    destination: rule.destination || t("notSet"),
                  })}
                </Badge>
              ))}
            </div>
          </Section>

          <Section title={t("deepLinks")} description={t("deepLinksDesc")}>
            <Grid columns={2}>
              <Field label={t("iosDestination")}>
                <Input placeholder={t("deepLinkPlaceholder")} {...register("iosDestination")} />
              </Field>
              <Field label={t("androidDestination")}>
                <Input placeholder={t("deepLinkPlaceholder")} {...register("androidDestination")} />
              </Field>
            </Grid>
          </Section>

          <Section
            title={t("abTest")}
            description={canAbTest ? t("abTestDesc") : t("abTestPaywall")}
            actions={
              canAbTest ? (
                <Button size="sm" onClick={addVariant}>
                  <Icon name="plus" className="text-sm" />
                  {t("addVariant")}
                </Button>
              ) : values.abVariants.length > 0 ? (
                <Button size="sm" onClick={() => setValue("abVariants", [], { shouldDirty: true })}>
                  {t("clearAb")}
                </Button>
              ) : null
            }
          >
            <div className="flex flex-col gap-3">
              {values.abVariants.map((variant, index) => (
                <div key={variant.id} className="flex items-end gap-2">
                  <Field label={t("variant", { n: index + 1 })} className="flex-1">
                    <Input
                      value={variant.destination}
                      placeholder={t("variantPlaceholder")}
                      disabled={!canAbTest}
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
                  <Field label={t("weight")} className="w-24">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={variant.weight}
                      disabled={!canAbTest}
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
                    aria-label={t("removeVariant")}
                    onClick={() =>
                      setValue(
                        "abVariants",
                        values.abVariants.filter((_, position) => position !== index),
                        { shouldDirty: true },
                      )
                    }
                  >
                    <Icon name="trash" className="text-sm text-danger" />
                  </Button>
                </div>
              ))}
              {values.abVariants.length === 1 ? (
                <p className="m-0 text-sm text-danger">{t("abNeedsTwo")}</p>
              ) : null}
            </div>
          </Section>
        </div>
      </TabPanel>

      <TabPanel active={tab === "campaign"}>
        <div className="flex flex-col gap-4">
          <p className="m-0 text-sm text-fg-muted">{t("campaignIntro")}</p>
          <Grid columns={2}>
            <Field label={t("utmSource")}>
              <Input placeholder={t("utmSourcePlaceholder")} {...register("utmSource")} />
            </Field>
            <Field label={t("utmMedium")}>
              <Input placeholder={t("utmMediumPlaceholder")} {...register("utmMedium")} />
            </Field>
            <Field label={t("utmCampaign")}>
              <Input placeholder={t("utmCampaignPlaceholder")} {...register("utmCampaign")} />
            </Field>
            <Field label={t("utmTerm")}>
              <Input {...register("utmTerm")} />
            </Field>
            <Field label={t("utmContent")}>
              <Input {...register("utmContent")} />
            </Field>
          </Grid>

          <Card staticHover className="flex-row items-center justify-between gap-4">
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t("forwardQuery")}</span>
              <span className="block text-sm text-fg-muted">{t("forwardQueryDesc")}</span>
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
            <Field label={t("expiresAt")} error={errors.expiresAt?.message}>
              <Input type="datetime-local" autoComplete="off" {...register("expiresAt")} />
            </Field>
            <Field label={t("expiredDestination")}>
              <Input
                placeholder={t("expiredPlaceholder")}
                autoComplete="off"
                {...register("expiredDestination")}
              />
            </Field>
          </Grid>

          <Field
            label={t("password")}
            hint={
              !canProtect
                ? t("passwordPaywall")
                : hasPassword
                  ? t("passwordKeep")
                  : t("passwordHint")
            }
          >
            <SecretInput
              domName="link-gate-password"
              disabled={!canProtect}
              ref={passwordField.ref}
              onChange={passwordField.onChange}
              onBlur={passwordField.onBlur}
            />
          </Field>

          <Card staticHover className="flex-row items-center justify-between gap-4">
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t("cloak")}</span>
              <span className="block text-sm text-fg-muted">
                {canCloak ? t("cloakDesc") : t("cloakPaywall")}
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
              <span className="block text-sm font-medium">{t("noIndex")}</span>
              <span className="block text-sm text-fg-muted">
                {t.rich("noIndexDesc", {
                  code: (chunks) => <code className="font-mono text-xs">{chunks}</code>,
                })}
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
                <span className="block text-sm font-medium">{tc("archive")}</span>
                <span className="block text-sm text-fg-muted">{t("archiveDesc")}</span>
              </span>
              <Switch
                checked={values.archived}
                onCheckedChange={(checked) => setValue("archived", checked, { shouldDirty: true })}
              />
            </Card>
          ) : null}

          <Field label={t("notes")}>
            <Textarea rows={3} {...register("comments")} />
          </Field>
        </div>
      </TabPanel>

      {formError ? <p className="m-0 text-sm text-danger">{formError}</p> : null}
      {saved && mode === "edit" ? (
        <p className="m-0 text-sm text-accent-hover">{t("savedLive")}</p>
      ) : null}

      <SaveBar
        dirty={isDirty || mode === "create"}
        saving={isSubmitting}
        message={mode === "create" ? t("readyToCreate") : tc("unsavedChanges")}
        actions={
          <>
            <Button size="sm" onClick={() => reset(defaultValues)} disabled={isSubmitting}>
              {t("discard")}
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("saving") : mode === "create" ? t("createLink") : t("saveChanges")}
            </Button>
          </>
        }
      />

      <Sheet
        open={rulesOpen}
        side="right"
        size="lg"
        title={t("targetingRules")}
        description={t("rulesSheetDesc")}
        onClose={() => setRulesOpen(false)}
        footer={
          <Button variant="primary" onClick={() => setRulesOpen(false)}>
            {tc("done")}
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
