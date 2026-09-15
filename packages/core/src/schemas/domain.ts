import { z } from "zod";
import { isValidHostname } from "../url";
import { destinationSchema } from "./link";

export const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .refine(isValidHostname, { message: "Enter a valid hostname like link.acme.com" })
  .refine((host) => !host.startsWith("www."), {
    message: "Use a dedicated subdomain, not www",
  });

export const domainInputSchema = z.object({
  hostname: hostnameSchema,
  rootDestination: destinationSchema.nullable().default(null),
  notFoundDestination: destinationSchema.nullable().default(null),
  isDefault: z.boolean().default(false),
});

export type DomainInput = z.infer<typeof domainInputSchema>;

export const WEBHOOK_EVENTS = [
  "link.created",
  "link.updated",
  "link.deleted",
  "link.clicked",
  "biopage.viewed",
  "domain.verified",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const webhookInputSchema = z.object({
  url: z.string().trim().url().max(2048),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  enabled: z.boolean().default(true),
});

export type WebhookInput = z.infer<typeof webhookInputSchema>;
