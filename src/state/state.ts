// SPDX-License-Identifier: MIT

export const SCHEMA_VERSION = 1;

export interface DailyIntake {
  date: string;
  kibble: number;
  snack: number;
  feast: number;
}

export interface CatState {
  schema_version: typeof SCHEMA_VERSION;
  cat_name: string;
  mood: number;
  total_feeding: number;
  level: number;
  last_event_id: string | null;
  /** ETag of the last Events API response, for conditional polling (ADR 0001). */
  events_etag: string | null;
  daily_intake: DailyIntake;
  updated_at: string;
}

const NEW_CAT_MOOD = 60;
const NEW_CAT_LEVEL = 1;

/** Formats a date as ISO 8601 UTC with second precision, e.g. 2026-07-16T09:23:11Z. */
export function toIsoUtcSeconds(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

/** Formats the UTC calendar date of a moment, e.g. 2026-07-16. */
export function toUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function newCatState(catName: string, now: Date): CatState {
  return {
    schema_version: SCHEMA_VERSION,
    cat_name: catName,
    mood: NEW_CAT_MOOD,
    total_feeding: 0,
    level: NEW_CAT_LEVEL,
    last_event_id: null,
    events_etag: null,
    daily_intake: { date: toUtcDate(now), kibble: 0, snack: 0, feast: 0 },
    updated_at: toIsoUtcSeconds(now),
  };
}

export function serializeState(state: CatState): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export function parseState(document: string): CatState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(document);
  } catch (error) {
    throw new Error(`state.json is not valid JSON: ${(error as Error).message}`);
  }
  if (!isRecord(parsed)) {
    throw new Error("state.json must be a JSON object");
  }
  if (parsed.schema_version !== SCHEMA_VERSION) {
    throw new Error(
      `state.json has unsupported schema_version ${JSON.stringify(parsed.schema_version)}`,
    );
  }
  const intake = parsed.daily_intake;
  if (!isRecord(intake)) {
    throw new Error("state.json field daily_intake must be an object");
  }
  return {
    schema_version: SCHEMA_VERSION,
    cat_name: requireString(parsed.cat_name, "cat_name"),
    mood: requireNumber(parsed.mood, "mood"),
    total_feeding: requireNumber(parsed.total_feeding, "total_feeding"),
    level: requireNumber(parsed.level, "level"),
    last_event_id: requireStringOrNull(parsed.last_event_id, "last_event_id"),
    // Absent in documents written before the collector existed; treat as never polled.
    events_etag: requireStringOrNull(parsed.events_etag ?? null, "events_etag"),
    daily_intake: {
      date: requireString(intake.date, "daily_intake.date"),
      kibble: requireNumber(intake.kibble, "daily_intake.kibble"),
      snack: requireNumber(intake.snack, "daily_intake.snack"),
      feast: requireNumber(intake.feast, "daily_intake.feast"),
    },
    updated_at: requireString(parsed.updated_at, "updated_at"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new Error(`state.json field ${name} must be a string`);
  }
  return value;
}

function requireNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`state.json field ${name} must be a number`);
  }
  return value;
}

function requireStringOrNull(value: unknown, name: string): string | null {
  if (value !== null && typeof value !== "string") {
    throw new Error(`state.json field ${name} must be a string or null`);
  }
  return value;
}
