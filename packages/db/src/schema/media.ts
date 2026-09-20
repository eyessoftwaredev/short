import { customType, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const WORKSPACE_MEDIA_KINDS = ["image"] as const;
export type WorkspaceMediaKind = (typeof WORKSPACE_MEDIA_KINDS)[number];

export const workspaceMedia = pgTable(
  "workspace_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    kind: text("kind").$type<WorkspaceMediaKind>().notNull().default("image"),
    contentType: text("content_type").notNull(),
    bytes: bytea("bytes").notNull(),
    filename: text("filename"),
    byteSize: integer("byte_size"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("workspace_media_workspace_idx").on(table.workspaceId)],
);

export type WorkspaceMediaRow = typeof workspaceMedia.$inferSelect;
