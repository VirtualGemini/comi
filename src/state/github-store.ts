// SPDX-License-Identifier: MIT
import type { GitDataClient } from "./git-data-client";
import { parseState, serializeState } from "./state";
import type { CatState } from "./state";
import { CARD_FILE, STATE_FILE } from "./store";
import type { StateFiles, StateStore } from "./store";

/**
 * Stores the cat state and the card on a dedicated branch of the profile
 * repository (ADR 0003). A missing branch is created with a root commit;
 * an existing branch advances by one commit per run, preserving any
 * unrelated files on it.
 */
export class GitHubStateStore implements StateStore {
  /**
   * Head commit sha of the state branch: undefined until first resolved,
   * null when the branch does not exist yet, otherwise the sha to commit on.
   */
  private headSha: string | null | undefined;

  constructor(
    private readonly git: GitDataClient,
    private readonly branch: string,
  ) {}

  async load(): Promise<CatState | null> {
    this.headSha = await this.git.getBranchHead(this.branch);
    if (this.headSha === null) {
      return null;
    }
    const document = await this.git.readTextFile(this.headSha, STATE_FILE);
    if (document === null) {
      return null;
    }
    return parseState(document);
  }

  async save(files: StateFiles, message: string): Promise<void> {
    const head =
      this.headSha === undefined ? await this.git.getBranchHead(this.branch) : this.headSha;
    const treeFiles = [
      { path: STATE_FILE, content: serializeState(files.state) },
      { path: CARD_FILE, content: files.card },
    ];
    if (head === null) {
      const tree = await this.git.createTree(treeFiles);
      const commit = await this.git.createCommit(message, tree, []);
      await this.git.createBranch(this.branch, commit);
      this.headSha = commit;
      return;
    }
    const baseTree = await this.git.getCommitTree(head);
    const tree = await this.git.createTree(treeFiles, baseTree);
    const commit = await this.git.createCommit(message, tree, [head]);
    await this.git.advanceBranch(this.branch, commit);
    this.headSha = commit;
  }
}
