// SPDX-License-Identifier: MIT
import type { getOctokit } from "@actions/github";
import { PER_PAGE } from "./events-client";
import type { EventPayload, EventsPageResult, EventsClient, OwnerEvent } from "./events-client";

type Octokit = ReturnType<typeof getOctokit>;

interface WireEvent {
  id: string;
  type: string | null;
  actor: { login: string };
  repo: { name: string };
  payload: unknown;
}

/**
 * Production adapter mapping the EventsClient port onto
 * `GET /users/{username}/events` (ADR 0001): one REST call per page, a 304
 * translated to not_modified, and payload fields extracted defensively —
 * the published schema types the payload loosely. Domain decisions stay in
 * the collector; this layer is verified live via workflow_dispatch.
 */
export class OctokitEventsClient implements EventsClient {
  constructor(
    private readonly octokit: Octokit,
    private readonly username: string,
  ) {}

  async listEventsPage(page: number, etag: string | null): Promise<EventsPageResult> {
    try {
      const response = await this.octokit.request("GET /users/{username}/events", {
        username: this.username,
        per_page: PER_PAGE,
        page,
        headers: etag === null ? {} : { "if-none-match": etag },
      });
      return {
        status: "ok",
        events: response.data.map((event: WireEvent) => toOwnerEvent(event)),
        etag: response.headers.etag ?? null,
      };
    } catch (error) {
      if (isNotModified(error)) {
        return { status: "not_modified" };
      }
      throw error;
    }
  }
}

function toOwnerEvent(raw: WireEvent): OwnerEvent {
  return {
    id: raw.id,
    type: raw.type ?? "",
    actor: { login: raw.actor.login },
    repo: { name: raw.repo.name },
    payload: toEventPayload(raw.payload),
  };
}

function toEventPayload(raw: unknown): EventPayload {
  if (!isRecord(raw)) {
    return {};
  }
  const payload: EventPayload = {};
  if (typeof raw.action === "string") {
    payload.action = raw.action;
  }
  if (typeof raw.distinct_size === "number") {
    payload.distinct_size = raw.distinct_size;
  }
  const pullRequest = raw.pull_request;
  if (isRecord(pullRequest)) {
    payload.pull_request = {
      merged: pullRequest.merged === true,
      merged_by: toMergedBy(pullRequest.merged_by),
    };
  }
  return payload;
}

function toMergedBy(raw: unknown): { login: string } | null {
  if (isRecord(raw) && typeof raw.login === "string") {
    return { login: raw.login };
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotModified(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 304
  );
}
