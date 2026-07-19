// SPDX-License-Identifier: MIT
import { describe, expect, test } from "vitest";
import { feedingFor } from "../../src/collect/diet";
import { event } from "./fixtures";

const OWNER = "mona";

describe("feedingFor kibble (PRD §3.3)", () => {
  test("a push counts one kibble serving per distinct commit", () => {
    const push = event({ type: "PushEvent", payload: { distinct_size: 3 } });
    expect(feedingFor(push, OWNER)).toEqual({ tier: "kibble", servings: 3 });
  });

  test("a push with no distinct commits feeds nothing", () => {
    const push = event({ type: "PushEvent", payload: { distinct_size: 0 } });
    expect(feedingFor(push, OWNER)).toBeNull();
  });
});

describe("feedingFor snack (PRD §3.3)", () => {
  test.each([
    ["IssuesEvent", "opened"],
    ["PullRequestEvent", "opened"],
    ["PullRequestReviewEvent", "created"],
    ["IssueCommentEvent", "created"],
  ])("%s(%s) is one snack serving", (type, action) => {
    expect(feedingFor(event({ type, payload: { action } }), OWNER)).toEqual({
      tier: "snack",
      servings: 1,
    });
  });

  test("a review counts regardless of action, as the PRD lists it unqualified", () => {
    expect(feedingFor(event({ type: "PullRequestReviewEvent", payload: {} }), OWNER)).toEqual({
      tier: "snack",
      servings: 1,
    });
  });

  test("a closed issue feeds nothing", () => {
    const closed = event({ type: "IssuesEvent", payload: { action: "closed" } });
    expect(feedingFor(closed, OWNER)).toBeNull();
  });

  test("a deleted comment feeds nothing", () => {
    const deleted = event({ type: "IssueCommentEvent", payload: { action: "deleted" } });
    expect(feedingFor(deleted, OWNER)).toBeNull();
  });
});

describe("feedingFor feast (PRD §3.3)", () => {
  test("a merged pull request the owner merged is one feast serving", () => {
    const merged = event({
      type: "PullRequestEvent",
      payload: { action: "closed", pull_request: { merged: true, merged_by: { login: "mona" } } },
    });
    expect(feedingFor(merged, OWNER)).toEqual({ tier: "feast", servings: 1 });
  });

  test("matches the merger login case-insensitively", () => {
    const merged = event({
      type: "PullRequestEvent",
      payload: { action: "closed", pull_request: { merged: true, merged_by: { login: "Mona" } } },
    });
    expect(feedingFor(merged, OWNER)).toEqual({ tier: "feast", servings: 1 });
  });

  test("a pull request closed without merging feeds nothing", () => {
    const closed = event({
      type: "PullRequestEvent",
      payload: { action: "closed", pull_request: { merged: false, merged_by: null } },
    });
    expect(feedingFor(closed, OWNER)).toBeNull();
  });

  test("a pull request merged by someone else feeds nothing", () => {
    const merged = event({
      type: "PullRequestEvent",
      payload: {
        action: "closed",
        pull_request: { merged: true, merged_by: { login: "a-maintainer" } },
      },
    });
    expect(feedingFor(merged, OWNER)).toBeNull();
  });

  test("a published release is one feast serving", () => {
    const release = event({ type: "ReleaseEvent", payload: { action: "published" } });
    expect(feedingFor(release, OWNER)).toEqual({ tier: "feast", servings: 1 });
  });

  test("a draft release feeds nothing", () => {
    const draft = event({ type: "ReleaseEvent", payload: { action: "created" } });
    expect(feedingFor(draft, OWNER)).toBeNull();
  });
});

describe("feedingFor other events", () => {
  test("an event type outside the diet feeds nothing", () => {
    expect(feedingFor(event({ type: "WatchEvent", payload: { action: "started" } }), OWNER)).toBe(
      null,
    );
  });

  test("an event outside the diet with no action feeds nothing", () => {
    expect(feedingFor(event({ type: "GollumEvent", payload: {} }), OWNER)).toBeNull();
  });
});
