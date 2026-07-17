// SPDX-License-Identifier: MIT
import type { getOctokit } from "@actions/github";
import type { GitDataClient, TreeFile } from "./git-data-client";

type Octokit = ReturnType<typeof getOctokit>;

/**
 * Production adapter mapping the GitDataClient port onto the GitHub REST
 * Git Data API: each method is one REST call plus response mapping, with
 * 404s translated to null. Domain decisions stay in GitHubStateStore; this
 * layer is verified live via workflow_dispatch (ticket 01, user-verified).
 */
export class OctokitGitDataClient implements GitDataClient {
  constructor(
    private readonly octokit: Octokit,
    private readonly owner: string,
    private readonly repo: string,
  ) {}

  private get repoRef(): { owner: string; repo: string } {
    return { owner: this.owner, repo: this.repo };
  }

  async getBranchHead(branch: string): Promise<string | null> {
    try {
      const response = await this.octokit.rest.git.getRef({
        ...this.repoRef,
        ref: `heads/${branch}`,
      });
      return response.data.object.sha;
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async getCommitTree(commitSha: string): Promise<string> {
    const response = await this.octokit.rest.git.getCommit({
      ...this.repoRef,
      commit_sha: commitSha,
    });
    return response.data.tree.sha;
  }

  async readTextFile(commitSha: string, path: string): Promise<string | null> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        ...this.repoRef,
        path,
        ref: commitSha,
      });
      const data = response.data;
      if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
        throw new Error(`unexpected content response for ${path}`);
      }
      return Buffer.from(data.content, "base64").toString("utf8");
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async createTree(files: TreeFile[], baseTreeSha?: string): Promise<string> {
    const response = await this.octokit.rest.git.createTree({
      ...this.repoRef,
      base_tree: baseTreeSha,
      tree: files.map((file) => ({
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        content: file.content,
      })),
    });
    return response.data.sha;
  }

  async createCommit(message: string, treeSha: string, parentShas: string[]): Promise<string> {
    const response = await this.octokit.rest.git.createCommit({
      ...this.repoRef,
      message,
      tree: treeSha,
      parents: parentShas,
    });
    return response.data.sha;
  }

  async createBranch(branch: string, commitSha: string): Promise<void> {
    await this.octokit.rest.git.createRef({
      ...this.repoRef,
      ref: `refs/heads/${branch}`,
      sha: commitSha,
    });
  }

  async advanceBranch(branch: string, commitSha: string): Promise<void> {
    await this.octokit.rest.git.updateRef({
      ...this.repoRef,
      ref: `heads/${branch}`,
      sha: commitSha,
      force: false,
    });
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 404
  );
}
