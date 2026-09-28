"use client";

import {
  BIOPAGE_TEMPLATE_PRESETS,
  BIOPAGE_TEMPLATES,
  GOOGLE_FONT_HREF,
  type BiopageTemplateId,
} from "@short/core";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BioPageView } from "@/components/bio/bio-page-view";
import { BioThumbnail } from "@/components/bio/bio-thumbnail";
import { Icon } from "@/components/kit/icon";
import {
  Button,
  Callout,
  Card,
  Field,
  Input,
  Select,
  Steps,
  toast,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { emptyBioForm, type BioFormValues } from "@/lib/bio-form";
import { cn } from "@/lib/cx";
import { createBiopageAction } from "../actions";
import { HandleField, type HandleFieldStatus } from "../handle-field";
import { PhoneFrame } from "../phone-frame";
import { previewPage } from "../preview";

export type BioDomainChoice = { id: string; hostname: string; ready: boolean };

type NewBioFlowProps = {
  defaultName: string;
  suggestedHandle: string;
  domains: BioDomainChoice[];
  platformHostname: string;
};

type Step = "look" | "address";

function withTemplate(values: BioFormValues, id: BiopageTemplateId): BioFormValues {
  const preset = BIOPAGE_TEMPLATE_PRESETS[id];
  return {
    ...values,
    templateId: id,
    theme: preset.theme,
    buttonStyle: preset.buttonStyle,
    fontFamily: preset.fontFamily,
    bgType: preset.bgType,
    bgColor: preset.bgColor ?? "",
    bgGradient: preset.bgGradient ?? "",
    buttonColor: preset.buttonColor ?? "",
    buttonTextColor: preset.buttonTextColor ?? "",
    textColor: preset.textColor ?? "",
  };
}

/**
 * Guided start for a new bio page: 1) pick a look, 2) name it and claim an address,
 * then the page is created as a draft and the builder opens to add links (step 3).
 */
export function NewBioFlow({ defaultName, suggestedHandle, domains, platformHostname }: NewBioFlowProps) {
  const t = useTranslations("bio");
  const tc = useTranslations("common");
  const router = useRouter();
  const actionMessage = useActionMessage();
  const [step, setStep] = useState<Step>("look");
  const [templateId, setTemplateId] = useState<BiopageTemplateId>("minimal");
  const [displayName, setDisplayName] = useState(defaultName);
  const [handle, setHandle] = useState(suggestedHandle);
  const [domainId, setDomainId] = useState("");
  const [handleStatus, setHandleStatus] = useState<HandleFieldStatus>("checking");
  const [handleError, setHandleError] = useState<string | undefined>(undefined);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const hostname =
    domains.find((domain) => domain.id === domainId)?.hostname ?? platformHostname;
  const name = displayName.trim() || defaultName || t("yourName");
  const values = withTemplate(
    { ...emptyBioForm(handle), displayName: name },
    templateId,
  );
  const fontHref = GOOGLE_FONT_HREF[values.fontFamily];
  // "checking" does not block: the server re-validates the handle on create anyway.
  const handleBlocked =
    handleStatus === "empty" ||
    handleStatus === "taken" ||
    handleStatus === "invalid" ||
    handleStatus === "reserved" ||
    handleStatus === "too_short" ||
    handleStatus === "premium";

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    if (displayName.trim() === "") {
      setNameError(t("displayNameRequired"));
      return;
    }
    if (handleBlocked) {
      return;
    }
    setPending(true);
    const result = await createBiopageAction(
      withTemplate(
        { ...emptyBioForm(handle.trim()), displayName: displayName.trim(), domainId },
        templateId,
      ),
    );
    if (!result.ok) {
      setPending(false);
      if (result.error.startsWith("handle_")) {
        setHandleError(
          result.error === "handle_taken"
            ? t("handleField.taken", { address: `${hostname}/${handle.trim()}` })
            : actionMessage(result.error),
        );
        return;
      }
      const handleIssue = result.fieldErrors?.handle?.[0];
      if (handleIssue) {
        setHandleError(handleIssue === "handleReserved" ? t("handleField.reserved") : t("handleField.invalid"));
        return;
      }
      setFormError(actionMessage(result.error));
      return;
    }
    toast.success(t("create.created"), t("create.createdBody"));
    router.push(`/bio/${result.data.id}/edit?welcome=1`);
  }

  const steps = [
    { id: "look", label: t("create.stepLook"), description: t("create.stepLookDesc") },
    { id: "address", label: t("create.stepAddress"), description: t("create.stepAddressDesc") },
    { id: "links", label: t("create.stepLinks"), description: t("create.stepLinksDesc") },
  ];

  const preview = (
    <PhoneFrame label={t("livePreview")} screenClassName="h-[32rem]">
      {fontHref ? <link rel="stylesheet" href={fontHref} /> : null}
      <BioPageView
        embedded
        interactive={false}
        showBranding={false}
        page={previewPage(values, "preview", name)}
      />
    </PhoneFrame>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Steps
        steps={steps}
        current={step}
        onStepClick={(id) => {
          if (id === "look" || id === "address") {
            setStep(id);
          }
        }}
      />

      {step === "look" ? (
        <Card
          title={t("create.lookTitle")}
          description={t("create.lookDesc")}
          footer={
            <>
              <span className="text-[13px] text-fg-subtle">{t("create.lookFooter")}</span>
              <Button variant="primary" trailingIcon="arrow-right" onClick={() => setStep("address")}>
                {t("create.continue")}
              </Button>
            </>
          }
        >
          <div
            role="radiogroup"
            aria-label={t("create.lookTitle")}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {BIOPAGE_TEMPLATES.map((id) => {
              const active = id === templateId;
              const preset = BIOPAGE_TEMPLATE_PRESETS[id];
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTemplateId(id)}
                  onDoubleClick={() => {
                    setTemplateId(id);
                    setStep("address");
                  }}
                  className={cn(
                    "group flex min-w-0 flex-col overflow-hidden rounded-lg border bg-bg p-0 text-left transition-[border-color,box-shadow] duration-150",
                    active
                      ? "border-accent ring-2 ring-accent"
                      : "border-border hover:border-border-strong hover:shadow-lift",
                  )}
                >
                  <span className="block h-44 overflow-hidden">
                    <BioThumbnail
                      displayName={name}
                      theme={preset.theme}
                      buttonStyle={preset.buttonStyle}
                      fontFamily={preset.fontFamily}
                      bgType={preset.bgType}
                      bgColor={preset.bgColor}
                      bgGradient={preset.bgGradient}
                      buttonColor={preset.buttonColor}
                      buttonTextColor={preset.buttonTextColor}
                      textColor={preset.textColor}
                      className="transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="flex min-w-0 items-center justify-between gap-2 border-t border-border-subtle px-3 py-2.5">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold text-ink">
                        {t(`templateName.${id}`)}
                      </span>
                      <span className="truncate text-xs text-fg-subtle">{t(`create.templateHint.${id}`)}</span>
                    </span>
                    {active ? (
                      <Icon name="circle-check" className="shrink-0 text-base text-accent" />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <form
          className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
          onSubmit={(event) => {
            void submit(event);
          }}
          noValidate
        >
          <Card
            title={t("create.addressTitle")}
            description={t("create.addressDesc")}
            className="gap-5 self-start"
            footer={
              <>
                <Button leadingIcon="arrow-left" onClick={() => setStep("look")} disabled={pending}>
                  {tc("back")}
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={pending}
                  disabled={handleBlocked}
                >
                  {t("create.submit")}
                </Button>
              </>
            }
          >
            <Field
              label={t("displayName")}
              info={t("displayNameInfo")}
              hint={t("create.nameHint")}
              error={nameError}
              required
            >
              <Input
                value={displayName}
                maxLength={80}
                autoFocus
                aria-invalid={Boolean(nameError) || undefined}
                placeholder={t("yourName")}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setNameError(undefined);
                }}
              />
            </Field>

            {domains.length > 0 ? (
              <Field label={t("domain")} info={t("domainInfo")} hint={t("domainHint")}>
                <Select value={domainId} onChange={(event) => setDomainId(event.target.value)}>
                  <option value="">{platformHostname}</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id} disabled={!domain.ready}>
                      {domain.ready
                        ? domain.hostname
                        : t("domainNotReady", { host: domain.hostname })}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <HandleField
              value={handle}
              onChange={(next) => {
                setHandle(next);
                setHandleError(undefined);
              }}
              domainId={domainId}
              hostname={hostname}
              error={handleError}
              onStatusChange={setHandleStatus}
            />

            {formError ? <Callout tone="danger" title={formError} /> : null}

            <Callout tone="info" icon="circle-info">
              {t("create.draftNote")}
            </Callout>
          </Card>

          <aside className="hidden min-w-0 lg:block">
            <div className="sticky top-20 flex flex-col items-center gap-3">
              {preview}
              <span className="max-w-full truncate font-mono text-xs text-fg-subtle">
                {hostname}/{handle || t("handleField.placeholder")}
              </span>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}
