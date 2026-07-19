// SPDX-License-Identifier: MIT
import { describe, expect, test } from "vitest";
import { newCatState, parseState, serializeState } from "../../src/state/state";

const NOW = new Date("2026-07-17T08:30:15.789Z");

describe("newCatState", () => {
  test("new cat starts with PRD §6 schema v1 defaults", () => {
    expect(newCatState("comi", NOW)).toEqual({
      schema_version: 1,
      cat_name: "comi",
      mood: 60,
      total_feeding: 0,
      level: 1,
      last_event_id: null,
      events_etag: null,
      daily_intake: { date: "2026-07-17", kibble: 0, snack: 0, feast: 0 },
      updated_at: "2026-07-17T08:30:15Z",
    });
  });

  test("daily intake date follows the run date", () => {
    const state = newCatState("mochi", new Date("2025-12-31T23:59:59Z"));
    expect(state.daily_intake).toEqual({ date: "2025-12-31", kibble: 0, snack: 0, feast: 0 });
  });
});

describe("serializeState", () => {
  test("emits the schema v1 document in PRD field order", () => {
    expect(serializeState(newCatState("comi", NOW))).toBe(`{
  "schema_version": 1,
  "cat_name": "comi",
  "mood": 60,
  "total_feeding": 0,
  "level": 1,
  "last_event_id": null,
  "events_etag": null,
  "daily_intake": {
    "date": "2026-07-17",
    "kibble": 0,
    "snack": 0,
    "feast": 0
  },
  "updated_at": "2026-07-17T08:30:15Z"
}
`);
  });
});

describe("parseState", () => {
  test("accepts the PRD §6 sample document", () => {
    const document = `{
      "schema_version": 1,
      "cat_name": "comi",
      "mood": 62.5,
      "total_feeding": 1180,
      "level": 5,
      "last_event_id": "34567890123",
      "daily_intake": { "date": "2026-07-16", "kibble": 9, "snack": 8, "feast": 0 },
      "updated_at": "2026-07-16T09:23:11Z"
    }`;
    expect(parseState(document)).toEqual({
      schema_version: 1,
      cat_name: "comi",
      mood: 62.5,
      total_feeding: 1180,
      level: 5,
      last_event_id: "34567890123",
      events_etag: null,
      daily_intake: { date: "2026-07-16", kibble: 9, snack: 8, feast: 0 },
      updated_at: "2026-07-16T09:23:11Z",
    });
  });

  test("round-trips a state carrying an events etag", () => {
    const state = { ...newCatState("comi", NOW), events_etag: 'W/"snapshot"' };
    expect(parseState(serializeState(state))).toEqual(state);
  });

  test("round-trips a serialized state", () => {
    const state = newCatState("comi", NOW);
    expect(parseState(serializeState(state))).toEqual(state);
  });

  test("rejects an unsupported schema_version", () => {
    const document = serializeState(newCatState("comi", NOW)).replace(
      '"schema_version": 1',
      '"schema_version": 2',
    );
    expect(() => parseState(document)).toThrow(/schema_version/);
  });

  test("rejects a document that is not JSON", () => {
    expect(() => parseState("not json")).toThrow(/state\.json/);
  });

  test("rejects a document with a missing field", () => {
    const document = `{
      "schema_version": 1,
      "cat_name": "comi",
      "total_feeding": 0,
      "level": 1,
      "last_event_id": null,
      "daily_intake": { "date": "2026-07-17", "kibble": 0, "snack": 0, "feast": 0 },
      "updated_at": "2026-07-17T08:30:15Z"
    }`;
    expect(() => parseState(document)).toThrow(/mood/);
  });
});
