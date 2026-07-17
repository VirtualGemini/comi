// SPDX-License-Identifier: MIT
import type { CatState } from "./state";

/** File names on the state branch; the README hotlinks the card via raw URL (PRD §5, §6). */
export const STATE_FILE = "state.json";
export const CARD_FILE = "comi.svg";

export interface StateFiles {
  state: CatState;
  card: string;
}

/** Persistence seam for the cat state and the card. */
export interface StateStore {
  /** Loads the current state, or null when this owner has no cat yet. */
  load(): Promise<CatState | null>;
  /** Writes state and card back as a single commit; every run commits (PRD §6 keep-alive). */
  save(files: StateFiles, message: string): Promise<void>;
}
