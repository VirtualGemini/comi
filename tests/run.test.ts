// SPDX-License-Identifier: MIT
import { describe, expect, test } from "vitest";
import { resolveConfig } from "../src/config";
import { COMMIT_MESSAGE, runComi } from "../src/run";
import { newCatState } from "../src/state/state";
import type { CatState } from "../src/state/state";
import type { StateFiles, StateStore } from "../src/state/store";

const FIRST_RUN = new Date("2026-07-17T08:30:15Z");
const SECOND_RUN = new Date("2026-07-17T09:30:15Z");

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

function deps(store: StateStore, now: Date) {
  return { store, now: () => now, info: () => {} };
}

describe("runComi first run", () => {
  test("initializes a new cat with schema v1 defaults and saves state with card", async () => {
    const store = new FakeStateStore();

    await runComi(resolveConfig({}), deps(store, FIRST_RUN));

    expect(store.saves).toHaveLength(1);
    const saved = store.saves[0];
    expect(saved?.files.state).toEqual(newCatState("comi", FIRST_RUN));
    expect(saved?.message).toBe(COMMIT_MESSAGE);
  });

  test("card shows the configured cat name and the level", async () => {
    const store = new FakeStateStore();

    await runComi(resolveConfig({ catName: "mochi" }), deps(store, FIRST_RUN));

    const card = store.saves[0]?.files.card ?? "";
    expect(card).toContain("mochi");
    expect(card).toContain("Lv.1");
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
    daily_intake: { date: "2026-07-16", kibble: 9, snack: 8, feast: 0 },
    updated_at: "2026-07-16T09:23:11Z",
  };

  test("keeps the cat as-is and only advances updated_at", async () => {
    const store = new FakeStateStore(existing);

    await runComi(resolveConfig({}), deps(store, SECOND_RUN));

    expect(store.saves[0]?.files.state).toEqual({
      ...existing,
      updated_at: "2026-07-17T09:30:15Z",
    });
  });

  test("saves on every run even when the cat did not change (keep-alive)", async () => {
    const store = new FakeStateStore(existing);

    await runComi(resolveConfig({}), deps(store, SECOND_RUN));
    await runComi(resolveConfig({}), deps(store, SECOND_RUN));

    expect(store.saves).toHaveLength(2);
  });

  test("renames the cat when the input changes", async () => {
    const store = new FakeStateStore(existing);

    await runComi(resolveConfig({ catName: "mochi" }), deps(store, SECOND_RUN));

    expect(store.saves[0]?.files.state.cat_name).toBe("mochi");
    expect(store.saves[0]?.files.card).toContain("mochi");
  });

  test("card reflects the stored level", async () => {
    const store = new FakeStateStore(existing);

    await runComi(resolveConfig({}), deps(store, SECOND_RUN));

    expect(store.saves[0]?.files.card).toContain("Lv.5");
  });
});
