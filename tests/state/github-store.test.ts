// SPDX-License-Identifier: MIT
import { describe, expect, test } from "vitest";
import type { GitDataClient, TreeFile } from "../../src/state/git-data-client";
import { CARD_FILE, STATE_FILE } from "../../src/state/store";
import { GitHubStateStore } from "../../src/state/github-store";
import { newCatState, parseState, serializeState } from "../../src/state/state";

const NOW = new Date("2026-07-17T08:30:15Z");

interface FakeCommit {
  message: string;
  tree: string;
  parents: string[];
}

/** In-memory stand-in for the GitHub Git Data API (docs/development.md §5). */
class FakeGitDataClient implements GitDataClient {
  branches = new Map<string, string>();
  commits = new Map<string, FakeCommit>();
  trees = new Map<string, Map<string, string>>();
  private sequence = 0;

  async getBranchHead(branch: string): Promise<string | null> {
    return this.branches.get(branch) ?? null;
  }

  async getCommitTree(commitSha: string): Promise<string> {
    const commit = this.commits.get(commitSha);
    if (commit === undefined) {
      throw new Error(`unknown commit ${commitSha}`);
    }
    return commit.tree;
  }

  async readTextFile(commitSha: string, path: string): Promise<string | null> {
    const tree = this.trees.get(await this.getCommitTree(commitSha));
    return tree?.get(path) ?? null;
  }

  async createTree(files: TreeFile[], baseTreeSha?: string): Promise<string> {
    const entries = new Map(baseTreeSha === undefined ? [] : this.trees.get(baseTreeSha));
    for (const file of files) {
      entries.set(file.path, file.content);
    }
    const sha = this.nextSha("tree");
    this.trees.set(sha, entries);
    return sha;
  }

  async createCommit(message: string, treeSha: string, parentShas: string[]): Promise<string> {
    const sha = this.nextSha("commit");
    this.commits.set(sha, { message, tree: treeSha, parents: parentShas });
    return sha;
  }

  async createBranch(branch: string, commitSha: string): Promise<void> {
    if (this.branches.has(branch)) {
      throw new Error(`branch ${branch} already exists`);
    }
    this.branches.set(branch, commitSha);
  }

  async advanceBranch(branch: string, commitSha: string): Promise<void> {
    if (!this.branches.has(branch)) {
      throw new Error(`branch ${branch} does not exist`);
    }
    this.branches.set(branch, commitSha);
  }

  head(branch: string): FakeCommit {
    const sha = this.branches.get(branch);
    const commit = sha === undefined ? undefined : this.commits.get(sha);
    if (commit === undefined) {
      throw new Error(`branch ${branch} has no head commit`);
    }
    return commit;
  }

  fileAtHead(branch: string, path: string): string | undefined {
    return this.trees.get(this.head(branch).tree)?.get(path);
  }

  private nextSha(kind: string): string {
    this.sequence += 1;
    return `${kind}-${this.sequence}`;
  }
}

function storeOn(git: FakeGitDataClient, branch = "pet"): GitHubStateStore {
  return new GitHubStateStore(git, branch);
}

describe("GitHubStateStore on a missing state branch", () => {
  test("load reports no cat yet", async () => {
    expect(await storeOn(new FakeGitDataClient()).load()).toBeNull();
  });

  test("save creates the branch with a root commit holding state and card", async () => {
    const git = new FakeGitDataClient();
    const store = storeOn(git);
    const state = newCatState("comi", NOW);
    await store.load();

    await store.save({ state, card: "<svg>comi</svg>" }, "comi: hello world");

    const head = git.head("pet");
    expect(head.parents).toEqual([]);
    expect(head.message).toBe("comi: hello world");
    expect(git.fileAtHead("pet", CARD_FILE)).toBe("<svg>comi</svg>");
    const written = git.fileAtHead("pet", STATE_FILE);
    if (written === undefined) {
      throw new Error("state.json missing from the head tree");
    }
    expect(parseState(written)).toEqual(state);
  });
});

describe("GitHubStateStore on an existing state branch", () => {
  async function seedBranch(git: FakeGitDataClient, files: TreeFile[]): Promise<void> {
    const tree = await git.createTree(files);
    const commit = await git.createCommit("seed", tree, []);
    await git.createBranch("pet", commit);
  }

  test("load returns the state saved by a previous run", async () => {
    const git = new FakeGitDataClient();
    const state = newCatState("comi", NOW);
    await seedBranch(git, [{ path: STATE_FILE, content: serializeState(state) }]);

    expect(await storeOn(git).load()).toEqual(state);
  });

  test("save appends a commit on top of the current head", async () => {
    const git = new FakeGitDataClient();
    const state = newCatState("comi", NOW);
    await seedBranch(git, [{ path: STATE_FILE, content: serializeState(state) }]);
    const previousHead = git.branches.get("pet");
    const store = storeOn(git);
    await store.load();

    await store.save({ state, card: "<svg/>" }, "comi: update cat state");

    expect(git.head("pet").parents).toEqual([previousHead]);
  });

  test("save keeps unrelated files already on the branch", async () => {
    const git = new FakeGitDataClient();
    const state = newCatState("comi", NOW);
    await seedBranch(git, [
      { path: STATE_FILE, content: serializeState(state) },
      { path: "keep.txt", content: "user data" },
    ]);
    const store = storeOn(git);
    await store.load();

    await store.save({ state, card: "<svg/>" }, "comi: update cat state");

    expect(git.fileAtHead("pet", "keep.txt")).toBe("user data");
    expect(git.fileAtHead("pet", CARD_FILE)).toBe("<svg/>");
  });

  test("load treats a branch without state.json as no cat yet", async () => {
    const git = new FakeGitDataClient();
    await seedBranch(git, [{ path: "keep.txt", content: "user data" }]);
    const store = storeOn(git);

    expect(await store.load()).toBeNull();

    await store.save({ state: newCatState("comi", NOW), card: "<svg/>" }, "comi: first commit");
    expect(git.head("pet").parents).toHaveLength(1);
    expect(git.fileAtHead("pet", "keep.txt")).toBe("user data");
  });

  test("load fails loudly on a corrupt state file instead of resetting the cat", async () => {
    const git = new FakeGitDataClient();
    await seedBranch(git, [{ path: STATE_FILE, content: "{ corrupt" }]);

    await expect(storeOn(git).load()).rejects.toThrow(/state\.json/);
  });

  test("save without a prior load still lands on the current head", async () => {
    const git = new FakeGitDataClient();
    const state = newCatState("comi", NOW);
    await seedBranch(git, [{ path: STATE_FILE, content: serializeState(state) }]);
    const previousHead = git.branches.get("pet");

    await storeOn(git).save({ state, card: "<svg/>" }, "comi: update cat state");

    expect(git.head("pet").parents).toEqual([previousHead]);
  });
});
