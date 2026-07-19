// SPDX-License-Identifier: MIT
import { describe, expect, test } from "vitest";
import { collectFeedings } from "../../src/collect/collector";
import { PER_PAGE } from "../../src/collect/events-client";
import type { OwnerEvent } from "../../src/collect/events-client";
import { FakeEventsClient, event } from "./fixtures";

const OWNER = "mona";

/** A run of single-commit pushes with ids newestId, newestId-1, ... */
function pushes(count: number, newestId: number): OwnerEvent[] {
  return Array.from({ length: count }, (_, i) =>
    event({ id: String(newestId - i), type: "PushEvent", payload: { distinct_size: 1 } }),
  );
}

function fresh(owner = OWNER) {
  return { owner, lastEventId: null, etag: null };
}

describe("collectFeedings on a fresh cat", () => {
  test("reads the whole stream and books guarded feedings oldest-first", async () => {
    const client = new FakeEventsClient([
      [
        event({ id: "300", type: "PushEvent", payload: { distinct_size: 2 } }),
        event({ id: "200", type: "IssuesEvent", payload: { action: "opened" } }),
        event({ id: "100", type: "PushEvent", payload: { distinct_size: 1 } }),
      ],
    ]);

    const collection = await collectFeedings(client, fresh());

    expect(collection.feedings).toEqual([
      { tier: "kibble", servings: 1 },
      { tier: "snack", servings: 1 },
      { tier: "kibble", servings: 2 },
    ]);
    expect(collection.lastEventId).toBe("300");
  });

  test("stores the etag of the poll for the next run", async () => {
    const client = new FakeEventsClient([pushes(2, 300)], { etag: 'W/"fresh"' });

    const collection = await collectFeedings(client, fresh());

    expect(collection.etag).toBe('W/"fresh"');
  });

  test("an empty stream books nothing and leaves the cursor unset", async () => {
    const client = new FakeEventsClient([[]], { etag: 'W/"empty"' });

    const collection = await collectFeedings(client, fresh());

    expect(collection.feedings).toEqual([]);
    expect(collection.lastEventId).toBeNull();
    expect(collection.etag).toBe('W/"empty"');
  });
});

describe("collectFeedings with a known last event", () => {
  test("books only events newer than last_event_id", async () => {
    const client = new FakeEventsClient([
      [
        event({ id: "300", type: "IssuesEvent", payload: { action: "opened" } }),
        event({ id: "200", type: "PushEvent", payload: { distinct_size: 5 } }),
        event({ id: "100", type: "PushEvent", payload: { distinct_size: 4 } }),
      ],
    ]);

    const collection = await collectFeedings(client, {
      owner: OWNER,
      lastEventId: "200",
      etag: null,
    });

    expect(collection.feedings).toEqual([{ tier: "snack", servings: 1 }]);
    expect(collection.lastEventId).toBe("300");
  });

  test("compares event ids numerically, not lexicographically", async () => {
    const client = new FakeEventsClient([
      [event({ id: "1000", type: "IssuesEvent", payload: { action: "opened" } })],
    ]);

    const collection = await collectFeedings(client, {
      owner: OWNER,
      lastEventId: "999",
      etag: null,
    });

    expect(collection.feedings).toEqual([{ tier: "snack", servings: 1 }]);
    expect(collection.lastEventId).toBe("1000");
  });

  test("collecting the same stream twice books nothing the second time", async () => {
    const pages = [pushes(3, 300)];
    const first = await collectFeedings(new FakeEventsClient(pages), fresh());

    const second = await collectFeedings(new FakeEventsClient(pages), {
      owner: OWNER,
      lastEventId: first.lastEventId,
      etag: null,
    });

    expect(first.feedings).toHaveLength(3);
    expect(second.feedings).toEqual([]);
    expect(second.lastEventId).toBe(first.lastEventId);
  });

  test("a guard-filtered event still advances last_event_id", async () => {
    const client = new FakeEventsClient([
      [event({ id: "400", actor: "dependabot[bot]", type: "PushEvent" })],
    ]);

    const collection = await collectFeedings(client, {
      owner: OWNER,
      lastEventId: "100",
      etag: null,
    });

    expect(collection.feedings).toEqual([]);
    expect(collection.lastEventId).toBe("400");
  });
});

describe("collectFeedings conditional polling", () => {
  test("an unchanged stream books nothing and keeps cursor and etag", async () => {
    const client = new FakeEventsClient([pushes(3, 300)], { notModifiedFor: 'W/"known"' });

    const collection = await collectFeedings(client, {
      owner: OWNER,
      lastEventId: "300",
      etag: 'W/"known"',
    });

    expect(collection).toEqual({ feedings: [], lastEventId: "300", etag: 'W/"known"' });
    expect(client.calls).toEqual([{ page: 1, etag: 'W/"known"' }]);
  });
});

describe("collectFeedings pagination", () => {
  test("a single short page needs no second request", async () => {
    const client = new FakeEventsClient([pushes(3, 300)]);

    await collectFeedings(client, fresh());

    expect(client.calls).toEqual([{ page: 1, etag: null }]);
  });

  test("follows full pages until the known event appears; only page 1 carries the etag", async () => {
    const client = new FakeEventsClient([pushes(PER_PAGE, 1000), pushes(PER_PAGE, 900)], {
      etag: 'W/"next"',
    });

    const collection = await collectFeedings(client, {
      owner: OWNER,
      lastEventId: "850",
      etag: 'W/"before"',
    });

    expect(collection.feedings).toHaveLength(150);
    expect(collection.lastEventId).toBe("1000");
    expect(collection.etag).toBe('W/"next"');
    expect(client.calls).toEqual([
      { page: 1, etag: 'W/"before"' },
      { page: 2, etag: null },
    ]);
  });

  test("stops at the API's 300-event window", async () => {
    const client = new FakeEventsClient([
      pushes(PER_PAGE, 3000),
      pushes(PER_PAGE, 2900),
      pushes(PER_PAGE, 2800),
      pushes(PER_PAGE, 2700),
    ]);

    const collection = await collectFeedings(client, fresh());

    expect(collection.feedings).toHaveLength(300);
    expect(client.calls).toHaveLength(3);
  });

  test("books an event repeated across a page boundary only once", async () => {
    const client = new FakeEventsClient([
      pushes(PER_PAGE, 500),
      [...pushes(1, 401), ...pushes(40, 400)],
    ]);

    const collection = await collectFeedings(client, fresh());

    expect(collection.feedings).toHaveLength(140);
    expect(collection.lastEventId).toBe("500");
  });
});
