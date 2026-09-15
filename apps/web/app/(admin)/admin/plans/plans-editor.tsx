"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import type { PlanFeatures, PlanKey, PlanLimits } from "@short/core";
import { formatLimit } from "@short/core";
import {
  Badge,
  Button,
  Field,
  Input,
  Select,
  Sheet,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { updatePlanAction, type PlanUpdateInput } from "./actions";

export type PlanEditorRow = {
  key: PlanKey;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: "USD" | "TRY" | "EUR";
  limits: PlanLimits;
  features: PlanFeatures;
  stripePriceMonthlyId: string | null;
  stripePriceYearlyId: string | null;
  visible: boolean;
  subscribers: number;
};

const LIMIT_FIELDS: Array<{ key: keyof PlanLimits; label: string; hint?: string }> = [
  { key: "links", label: "Links", hint: "-1 for unlimited" },
  { key: "clicksPerMonth", label: "Clicks / month" },
  { key: "customDomains", label: "Custom domains" },
  { key: "biopages", label: "Bio pages" },
  { key: "qrCodes", label: "QR codes" },
  { key: "members", label: "Team members" },
  { key: "retentionDays", label: "Retention (days)" },
  { key: "apiRequestsPerHour", label: "API requests / hour" },
];

const FEATURE_FIELDS: Array<{ key: keyof PlanFeatures; label: string }> = [
  { key: "targeting", label: "Geo & device targeting" },
  { key: "abTesting", label: "A/B testing" },
  { key: "passwordProtection", label: "Password protection" },
  { key: "cloaking", label: "Link cloaking" },
  { key: "qrLogo", label: "QR logo" },
  { key: "webhooks", label: "Webhooks" },
  { key: "apiAccess", label: "REST API" },
  { key: "removeBranding", label: "Remove branding" },
];

export function PlansEditor({ rows }: { rows: PlanEditorRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<PlanEditorRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save(): void {
    if (!draft) {
      return;
    }
    const payload: PlanUpdateInput = {
      key: draft.key,
      name: draft.name,
      priceMonthly: draft.priceMonthly,
      priceYearly: draft.priceYearly,
      currency: draft.currency,
      stripePriceMonthlyId: draft.stripePriceMonthlyId,
      stripePriceYearlyId: draft.stripePriceYearlyId,
      visible: draft.visible,
      limits: draft.limits,
      features: draft.features,
    };

    setError(null);
    startTransition(async () => {
      const result = await updatePlanAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft(null);
      router.refresh();
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Plan</TableHeaderCell>
            <TableHeaderCell className="text-right">Monthly</TableHeaderCell>
            <TableHeaderCell className="text-right">Yearly</TableHeaderCell>
            <TableHeaderCell className="text-right">Links</TableHeaderCell>
            <TableHeaderCell className="text-right">Clicks</TableHeaderCell>
            <TableHeaderCell className="text-right">Subscribers</TableHeaderCell>
            <TableHeaderCell className="text-right">Edit</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{row.name}</span>
                  {row.visible ? null : <Badge tone="muted">Hidden</Badge>}
                  {row.stripePriceMonthlyId ?? row.stripePriceYearlyId ? null : (
                    <Badge tone="warn">No Stripe price</Badge>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(row.priceMonthly, row.currency)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(row.priceYearly, row.currency)}
              </TableCell>
              <TableCell className="text-right font-mono">{formatLimit(row.limits.links)}</TableCell>
              <TableCell className="text-right font-mono">
                {formatLimit(row.limits.clicksPerMonth)}
              </TableCell>
              <TableCell className="text-right font-mono">{row.subscribers}</TableCell>
              <TableCell>
                <span className="flex justify-end">
                  <Button
                    size="sm"
                    icon
                    aria-label={`Edit ${row.name}`}
                    onClick={() => setDraft({ ...row })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet
        open={draft !== null}
        size="lg"
        title={`Edit ${draft?.name ?? "plan"}`}
        description="Changes apply to every workspace on this plan on their next request."
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button onClick={() => setDraft(null)}>Cancel</Button>
            <Button variant="primary" disabled={pending} onClick={save}>
              Save plan
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="flex min-w-0 flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </Field>
              <Field label="Currency">
                <Select
                  value={draft.currency}
                  onChange={(event) =>
                    setDraft({ ...draft, currency: event.target.value as "USD" | "TRY" | "EUR" })
                  }
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="TRY">TRY</option>
                </Select>
              </Field>
              <Field label="Monthly price" hint="In minor units (cents / kuruş).">
                <Input
                  type="number"
                  min={0}
                  value={draft.priceMonthly}
                  onChange={(event) =>
                    setDraft({ ...draft, priceMonthly: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Yearly price" hint="In minor units (cents / kuruş).">
                <Input
                  type="number"
                  min={0}
                  value={draft.priceYearly}
                  onChange={(event) =>
                    setDraft({ ...draft, priceYearly: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Stripe monthly price id">
                <Input
                  value={draft.stripePriceMonthlyId ?? ""}
                  placeholder="price_..."
                  onChange={(event) =>
                    setDraft({ ...draft, stripePriceMonthlyId: event.target.value })
                  }
                />
              </Field>
              <Field label="Stripe yearly price id">
                <Input
                  value={draft.stripePriceYearlyId ?? ""}
                  placeholder="price_..."
                  onChange={(event) =>
                    setDraft({ ...draft, stripePriceYearlyId: event.target.value })
                  }
                />
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
              <span className="min-w-0">
                <span className="block text-sm font-medium">Visible on the billing page</span>
                <span className="block text-xs text-fg-subtle">
                  Hide a plan to keep existing subscribers without offering new signups.
                </span>
              </span>
              <Switch
                checked={draft.visible}
                onCheckedChange={(visible) => setDraft({ ...draft, visible })}
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-5">
              <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
                Limits
              </span>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {LIMIT_FIELDS.map((field) => (
                  <Field key={field.key} label={field.label} hint={field.hint}>
                    <Input
                      type="number"
                      min={-1}
                      value={draft.limits[field.key]}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          limits: { ...draft.limits, [field.key]: Number(event.target.value) },
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-5">
              <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
                Features
              </span>
              {FEATURE_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-fg-muted">{field.label}</span>
                  <Switch
                    checked={draft.features[field.key]}
                    onCheckedChange={(checked) =>
                      setDraft({
                        ...draft,
                        features: { ...draft.features, [field.key]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
