// SPDX-License-Identifier: MIT
import type { OwnerEvent } from "./events-client";
import { sameGitHubName } from "./guards";

/** Diet tiers of the feeding recipe (PRD §3.3). */
export type DietTier = "kibble" | "snack" | "feast";

/** One event's contribution to the diet: which tier and how many servings. */
export interface Feeding {
  tier: DietTier;
  servings: number;
}

/**
 * Maps one guarded event onto the diet table (PRD §3.3), or null when the
 * event does not feed the cat. A PushEvent yields one kibble serving per
 * distinct commit; snack events yield one serving each; a merge the owner
 * performed and a published release yield one feast serving each.
 */
export function feedingFor(event: OwnerEvent, owner: string): Feeding | null {
  switch (event.type) {
    case "PushEvent": {
      const distinct = event.payload.distinct_size ?? 0;
      return distinct > 0 ? { tier: "kibble", servings: distinct } : null;
    }
    case "IssuesEvent":
      return event.payload.action === "opened" ? oneServing("snack") : null;
    case "PullRequestEvent":
      if (event.payload.action === "opened") {
        return oneServing("snack");
      }
      if (event.payload.action === "closed" && isMergedByOwner(event, owner)) {
        return oneServing("feast");
      }
      return null;
    // The PRD lists reviews with no action qualifier, so every one counts.
    case "PullRequestReviewEvent":
      return oneServing("snack");
    case "IssueCommentEvent":
      return event.payload.action === "created" ? oneServing("snack") : null;
    case "ReleaseEvent":
      return event.payload.action === "published" ? oneServing("feast") : null;
    default:
      return null;
  }
}

function oneServing(tier: DietTier): Feeding {
  return { tier, servings: 1 };
}

function isMergedByOwner(event: OwnerEvent, owner: string): boolean {
  const pullRequest = event.payload.pull_request;
  if (pullRequest?.merged !== true) {
    return false;
  }
  const mergedBy = pullRequest.merged_by?.login;
  return mergedBy !== undefined && sameGitHubName(mergedBy, owner);
}
