// SPDX-License-Identifier: MIT
import type {
  EventPayload,
  EventsClient,
  EventsPageResult,
  OwnerEvent,
} from "../../src/collect/events-client";

let sequence = 1000;

/** Builds an event that passes every guard for owner "mona" unless overridden. */
export function event(overrides: {
  id?: string;
  type?: string;
  actor?: string;
  repo?: string;
  payload?: EventPayload;
}): OwnerEvent {
  sequence += 1;
  return {
    id: overrides.id ?? String(sequence),
    type: overrides.type ?? "PushEvent",
    actor: { login: overrides.actor ?? "mona" },
    repo: { name: overrides.repo ?? "mona/hello-world" },
    payload: overrides.payload ?? { distinct_size: 1 },
  };
}

/** In-memory stand-in for the Events API (docs/development.md §5). */
export class FakeEventsClient implements EventsClient {
  calls: { page: number; etag: string | null }[] = [];

  constructor(
    private readonly pages: OwnerEvent[][],
    private readonly options: { etag?: string | null; notModifiedFor?: string } = {},
  ) {}

  async listEventsPage(page: number, etag: string | null): Promise<EventsPageResult> {
    this.calls.push({ page, etag });
    if (etag !== null && etag === this.options.notModifiedFor) {
      return { status: "not_modified" };
    }
    return { status: "ok", events: this.pages[page - 1] ?? [], etag: this.options.etag ?? null };
  }
}
