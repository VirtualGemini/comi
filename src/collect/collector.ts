// SPDX-License-Identifier: MIT
import { feedingFor } from "./diet";
import type { Feeding } from "./diet";
import { PER_PAGE } from "./events-client";
import type { EventsClient, OwnerEvent } from "./events-client";
import { passesGuards } from "./guards";

/** The events feed keeps ~300 events (PRD §6 platform constraint), three full pages. */
const MAX_PAGES = 3;

export interface CollectInput {
  owner: string;
  lastEventId: string | null;
  etag: string | null;
}

/** What one poll produced: the feedings to book and the cursor to persist. */
export interface CollectResult {
  feedings: Feeding[];
  lastEventId: string | null;
  etag: string | null;
}

/**
 * Polls the owner's event stream through the injected client (ADR 0001):
 * page one rides the stored ETag, pages follow until the stream ends, the
 * known last_event_id appears, or the API window is exhausted. New events
 * pass the guard rules and the diet table; feedings come back oldest-first.
 * Every seen event advances last_event_id, so a bot's or the profile
 * repository's own activity is never re-examined on later runs.
 */
export async function collectFeedings(
  client: EventsClient,
  input: CollectInput,
): Promise<CollectResult> {
  const first = await client.listEventsPage(1, input.etag);
  if (first.status === "not_modified") {
    return { feedings: [], lastEventId: input.lastEventId, etag: input.etag };
  }

  const newEvents: OwnerEvent[] = [];
  const seen = new Set<string>();
  let page = first;
  let pageNumber = 1;
  let reachedKnown = false;
  for (;;) {
    for (const event of page.events) {
      if (!isNewer(event.id, input.lastEventId)) {
        reachedKnown = true;
        break;
      }
      if (seen.has(event.id)) {
        continue;
      }
      seen.add(event.id);
      newEvents.push(event);
    }
    if (reachedKnown || page.events.length < PER_PAGE || pageNumber >= MAX_PAGES) {
      break;
    }
    pageNumber += 1;
    const next = await client.listEventsPage(pageNumber, null);
    if (next.status === "not_modified") {
      break;
    }
    page = next;
  }

  const feedings = newEvents
    .filter((event) => passesGuards(event, input.owner))
    .map((event) => feedingFor(event, input.owner))
    .filter((feeding): feeding is Feeding => feeding !== null)
    .reverse();
  return {
    feedings,
    lastEventId: newEvents[0]?.id ?? input.lastEventId,
    etag: first.etag,
  };
}

function isNewer(id: string, lastEventId: string | null): boolean {
  return lastEventId === null || BigInt(id) > BigInt(lastEventId);
}
