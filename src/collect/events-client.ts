// SPDX-License-Identifier: MIT

/** Page size for the events feed; 3 pages cover the API's ~300-event window (PRD §6). */
export const PER_PAGE = 100;

/** The slice of a public event the diet and the guard rules read (PRD §3.3). */
export interface OwnerEvent {
  id: string;
  type: string;
  actor: { login: string };
  repo: { name: string };
  payload: EventPayload;
}

export interface EventPayload {
  action?: string;
  /** PushEvent: number of distinct commits in the push. */
  distinct_size?: number;
  pull_request?: {
    merged?: boolean;
    merged_by?: { login: string } | null;
  };
}

export type EventsPageResult =
  | { status: "ok"; events: OwnerEvent[]; etag: string | null }
  | { status: "not_modified" };

/**
 * Narrow port over `GET /users/{username}/events` (ADR 0001). The production
 * adapter wraps octokit; unit tests inject an in-memory fake
 * (docs/development.md §5). Pages are newest-first; `etag` rides
 * If-None-Match and only the first page of a poll sends it.
 */
export interface EventsClient {
  listEventsPage(page: number, etag: string | null): Promise<EventsPageResult>;
}
