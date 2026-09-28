import { z } from "zod";
import { isPublicHttpUrl, isValidHostname } from "../url";
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
  "link.broken",
  "biopage.viewed",
  "domain.verified",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const webhookInputSchema = z.object({
  // The panel POSTs to this URL and stores the response body where the customer can
  // read it, so anything reachable only from inside the network must be refused.
  url: z
    .string()
    .trim()
    .max(2048)
    .refine(isPublicHttpUrl, { message: "Enter a public http(s) URL" }),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  enabled: z.boolean().default(true),
});

export type WebhookInput = z.infer<typeof webhookInputSchema>;
