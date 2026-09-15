import { toEventRow, type TrackedEvent } from "@short/core";
import { getClickhouse } from "./client";
import { EVENTS_TABLE } from "./ddl";

export async function insertEvents(events: TrackedEvent[]): Promise<void> {
  if (events.length === 0) {
    return;
  }
  await getClickhouse().insert({
    table: EVENTS_TABLE,
    values: events.map(toEventRow),
    format: "JSONEachRow",
    clickhouse_settings: {
      async_insert: 1,
      wait_for_async_insert: 1,
    },
  });
}
