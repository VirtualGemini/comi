// SPDX-License-Identifier: MIT
import { collectFeedings } from "./collect/collector";
import type { CollectResult } from "./collect/collector";
import type { DietTier } from "./collect/diet";
import type { EventsClient } from "./collect/events-client";
import type { ComiConfig } from "./config";
import { renderPlaceholderCard } from "./render/placeholder-card";
import { newCatState, toIsoUtcSeconds } from "./state/state";
import type { CatState } from "./state/state";
import type { StateStore } from "./state/store";

export const COMMIT_MESSAGE = "comi: update cat state";

export interface RunDeps {
  store: StateStore;
  events: EventsClient;
  /** Login of the profile owner — the cat's owner, whose events feed it. */
  owner: string;
  now: () => Date;
  info: (message: string) => void;
}

/**
 * One scheduled run: load or initialize the cat, poll the owner's activity
 * into feedings and log the intake list, advance the event cursor, redraw
 * the card, and commit everything back. Saving unconditionally keeps the
 * scheduled workflow alive (PRD §6).
 */
export async function runComi(config: ComiConfig, deps: RunDeps): Promise<void> {
  const existing = await deps.store.load();
  const now = deps.now();
  const base: CatState =
    existing === null
      ? newCatState(config.catName, now)
      : { ...existing, cat_name: config.catName, updated_at: toIsoUtcSeconds(now) };
  if (existing === null) {
    deps.info(`comi: adopting a new cat named ${config.catName}`);
  }
  const collection = await collectFeedings(deps.events, {
    owner: deps.owner,
    lastEventId: base.last_event_id,
    etag: base.events_etag,
  });
  logIntake(collection, deps.info);
  const state: CatState = {
    ...base,
    last_event_id: collection.lastEventId,
    events_etag: collection.etag,
  };
  const card = renderPlaceholderCard(state);
  await deps.store.save({ state, card }, COMMIT_MESSAGE);
  deps.info(`comi: ${state.cat_name} saved (Lv.${state.level}, mood ${state.mood})`);
}

/** Lists what was booked this run, one servings count per diet tier. */
function logIntake(collection: CollectResult, info: (message: string) => void): void {
  if (collection.feedings.length === 0) {
    info("comi: no new feedings this run");
    return;
  }
  const totals: Record<DietTier, number> = { kibble: 0, snack: 0, feast: 0 };
  for (const feeding of collection.feedings) {
    totals[feeding.tier] += feeding.servings;
  }
  info(
    `comi: intake this run: kibble x${totals.kibble}, snack x${totals.snack}, feast x${totals.feast}`,
  );
}
