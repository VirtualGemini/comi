// SPDX-License-Identifier: MIT
import { describe, expect, test } from "vitest";
import type { EventsClient } from "../src/collect/events-client";
import { resolveConfig } from "../src/config";
import { COMMIT_MESSAGE, runComi } from "../src/run";
import type { RunDeps } from "../src/run";
import { newCatState } from "../src/state/state";
import type { CatState } from "../src/state/state";
import type { StateFiles, StateStore } from "../src/state/store";
import { FakeEventsClient, event } from "./collect/fixtures";

const FIRST_RUN = new Date("2026-07-17T08:30:15Z");
const SECOND_RUN = new Date("2026-07-17T09:30:15Z");
const OWNER = "mona";

class FakeStateStore implements StateStore {
  saves: { files: StateFiles; message: string }[] = [];

  constructor(private stored: CatState | null = null) {}

  async load(): Promise<CatState | null> {
    return this.stored;
  }

  async save(files: StateFiles, message: string): Promise<void> {
    this.saves.push({ files, message });
    this.stored = files.state;
  }
}

function testRun(store: StateStore, now: Date, events: EventsClient = new FakeEventsClient([[]])) {
  const logs: string[] = [];
  const deps: RunDeps = {
    store,
    events,
    owner: OWNER,
    now: () => now,
    info: (message) => logs.push(message),
  };
  return { deps, logs };
}

describe("runComi first run", () => {
  test("initializes a new cat with schema v1 defaults and saves state with card", async () => {
    const store = new FakeStateStore();

    await runComi(resolveConfig({}), testRun(store, FIRST_RUN).deps);

    expect(store.saves).toHaveLength(1);
    const saved = store.saves[0];
    expect(saved?.files.state).toEqual(newCatState("comi", FIRST_RUN));
    expect(saved?.message).toBe(COMMIT_MESSAGE);
  });

  test("card shows the configured cat name and the level", async () => {
    const store = new FakeStateStore();

    await runComi(resolveConfig({ catName: "mochi" }), testRun(store, FIRST_RUN).deps);

    const card = store.saves[0]?.files.card ?? "";
    expect(card).toContain("mochi");
    expect(card).toContain("Lv.1");
  });

  test("a new cat books the whole visible stream on adoption", async () => {
    const store = new FakeStateStore();
    const events = new FakeEventsClient(
      [[event({ id: "500", type: "PushEvent", payload: { distinct_size: 2 } })]],
      { etag: 'W/"first-poll"' },
    );

    await runComi(resolveConfig({}), testRun(store, FIRST_RUN, events).deps);

    const saved = store.saves[0]?.files.state;
    expect(saved?.last_event_id).toBe("500");
    expect(saved?.events_etag).toBe('W/"first-poll"');
  });
});

describe("runComi on an existing cat", () => {
  const existing: CatState = {
    schema_version: 1,
    cat_name: "comi",
    mood: 62.5,
    total_feeding: 1180,
    level: 5,
    last_event_id: "34567890123",
    events_etag: null,
    daily_intake: { date: "2026-07-16", kibble: 9, snack: 8, feast: 0 },
    updated_at: "2026-07-16T09:23:11Z",
  };

  test("keeps the cat as-is and only advances updated_at", async () => {
    const store = new FakeStateStore(existing);

    await runComi(resolveConfig({}), testRun(store, SECOND_RUN).deps);

    expect(store.saves[0]?.files.state).toEqual({
      ...existing,
      updated_at: "2026-07-17T09:30:15Z",
    });
  });

  test("saves on every run even when the cat did not change (keep-alive)", async () => {
    const store = new FakeStateStore(existing);

    await runComi(resolveConfig({}), testRun(store, SECOND_RUN).deps);
    await runComi(resolveConfig({}), testRun(store, SECOND_RUN).deps);

    expect(store.saves).toHaveLength(2);
  });

  test("renames the cat when the input changes", async () => {
    const store = new FakeStateStore(existing);

    await runComi(resolveConfig({ catName: "mochi" }), testRun(store, SECOND_RUN).deps);

    expect(store.saves[0]?.files.state.cat_name).toBe("mochi");
    expect(store.saves[0]?.files.card).toContain("mochi");
  });

  test("card reflects the stored level", async () => {
    const store = new FakeStateStore(existing);

    await runComi(resolveConfig({}), testRun(store, SECOND_RUN).deps);

    expect(store.saves[0]?.files.card).toContain("Lv.5");
  });

  test("books new feedings, advances the cursor, and logs the intake list", async () => {
    const store = new FakeStateStore(existing);
    const events = new FakeEventsClient(
      [
        [
          event({ id: "34567890300", type: "PullRequestEvent", payload: { action: "opened" } }),
          event({ id: "34567890200", type: "PushEvent", payload: { distinct_size: 3 } }),
        ],
      ],
      { etag: 'W/"poll-2"' },
    );
    const { deps, logs } = testRun(store, SECOND_RUN, events);

    await runComi(resolveConfig({}), deps);

    expect(logs).toContain("comi: intake this run: kibble x3, snack x1, feast x0");
    const saved = store.saves[0]?.files.state;
    expect(saved?.last_event_id).toBe("34567890300");
    expect(saved?.events_etag).toBe('W/"poll-2"');
    expect(saved?.mood).toBe(existing.mood);
    expect(saved?.total_feeding).toBe(existing.total_feeding);
    expect(saved?.daily_intake).toEqual(existing.daily_intake);
  });

  test("logs that nothing was booked on a quiet stream", async () => {
    const { deps, logs } = testRun(new FakeStateStore(existing), SECOND_RUN);

    await runComi(resolveConfig({}), deps);

    expect(logs).toContain("comi: no new feedings this run");
  });

  test("polls with the stored etag and keeps it when the stream is unchanged", async () => {
    const cat = { ...existing, events_etag: 'W/"poll-1"' };
    const store = new FakeStateStore(cat);
    const events = new FakeEventsClient(
      [[event({ id: "34567890200", type: "PushEvent", payload: { distinct_size: 1 } })]],
      { notModifiedFor: 'W/"poll-1"' },
    );
    const { deps, logs } = testRun(store, SECOND_RUN, events);

    await runComi(resolveConfig({}), deps);

    expect(events.calls).toEqual([{ page: 1, etag: 'W/"poll-1"' }]);
    expect(logs).toContain("comi: no new feedings this run");
    const saved = store.saves[0]?.files.state;
    expect(saved?.events_etag).toBe('W/"poll-1"');
    expect(saved?.last_event_id).toBe(existing.last_event_id);
  });

  test("does not book the same event again on the next run", async () => {
    const store = new FakeStateStore();
    const stream = [event({ id: "500", type: "PushEvent", payload: { distinct_size: 2 } })];

    const first = testRun(store, FIRST_RUN, new FakeEventsClient([stream]));
    await runComi(resolveConfig({}), first.deps);
    const second = testRun(store, SECOND_RUN, new FakeEventsClient([stream]));
    await runComi(resolveConfig({}), second.deps);

    expect(first.logs).toContain("comi: intake this run: kibble x2, snack x0, feast x0");
    expect(second.logs).toContain("comi: no new feedings this run");
    expect(store.saves[1]?.files.state.last_event_id).toBe("500");
  });
});
