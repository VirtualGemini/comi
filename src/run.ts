// SPDX-License-Identifier: MIT
import type { ComiConfig } from "./config";
import { renderPlaceholderCard } from "./render/placeholder-card";
import { newCatState, toIsoUtcSeconds } from "./state/state";
import type { CatState } from "./state/state";
import type { StateStore } from "./state/store";

export const COMMIT_MESSAGE = "comi: update cat state";

export interface RunDeps {
  store: StateStore;
  now: () => Date;
  info: (message: string) => void;
}

/**
 * One scheduled run: load or initialize the cat, advance updated_at, redraw
 * the card, and commit both files back. Saving unconditionally keeps the
 * scheduled workflow alive (PRD §6).
 */
export async function runComi(config: ComiConfig, deps: RunDeps): Promise<void> {
  const existing = await deps.store.load();
  const now = deps.now();
  const state: CatState =
    existing === null
      ? newCatState(config.catName, now)
      : { ...existing, cat_name: config.catName, updated_at: toIsoUtcSeconds(now) };
  if (existing === null) {
    deps.info(`comi: adopting a new cat named ${config.catName}`);
  }
  const card = renderPlaceholderCard(state);
  await deps.store.save({ state, card }, COMMIT_MESSAGE);
  deps.info(`comi: ${state.cat_name} saved (Lv.${state.level}, mood ${state.mood})`);
}
