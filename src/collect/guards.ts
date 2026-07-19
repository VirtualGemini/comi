// SPDX-License-Identifier: MIT
import type { OwnerEvent } from "./events-client";

/** GitHub logins and repository names compare case-insensitively. */
export function sameGitHubName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Guard rules (PRD §3.3): only events the owner performed feed the cat,
 * the profile repository's own events do not count, and bot identities do
 * not count.
 */
export function passesGuards(event: OwnerEvent, owner: string): boolean {
  const actor = event.actor.login;
  if (!sameGitHubName(actor, owner)) {
    return false;
  }
  if (actor.toLowerCase().endsWith("[bot]")) {
    return false;
  }
  return !sameGitHubName(event.repo.name, `${owner}/${owner}`);
}
