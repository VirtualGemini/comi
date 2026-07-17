// SPDX-License-Identifier: MIT

/** A text file to place into a commit tree. */
export interface TreeFile {
  path: string;
  content: string;
}

/**
 * Narrow port over the GitHub Git Data API. The production adapter wraps
 * octokit; unit tests inject an in-memory fake (docs/development.md §5).
 */
export interface GitDataClient {
  /** Resolves the head commit sha of a branch, or null when the branch does not exist. */
  getBranchHead(branch: string): Promise<string | null>;
  /** Resolves the tree sha a commit points at. */
  getCommitTree(commitSha: string): Promise<string>;
  /** Reads a text file at a commit, or null when the path does not exist there. */
  readTextFile(commitSha: string, path: string): Promise<string | null>;
  /** Creates a tree with the given files, layered on baseTreeSha when provided. */
  createTree(files: TreeFile[], baseTreeSha?: string): Promise<string>;
  /** Creates a commit and returns its sha; an empty parents list makes a root commit. */
  createCommit(message: string, treeSha: string, parentShas: string[]): Promise<string>;
  /** Creates the branch pointing at a commit. */
  createBranch(branch: string, commitSha: string): Promise<void>;
  /** Fast-forwards the existing branch to a commit. */
  advanceBranch(branch: string, commitSha: string): Promise<void>;
}
