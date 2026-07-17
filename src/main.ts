// SPDX-License-Identifier: MIT
import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { resolveConfig } from "./config";
import { runComi } from "./run";
import { GitHubStateStore } from "./state/github-store";
import { OctokitGitDataClient } from "./state/octokit-git-data-client";

async function main(): Promise<void> {
  const token = core.getInput("github_token", { required: true });
  const config = resolveConfig({
    catName: core.getInput("cat_name"),
    lang: core.getInput("lang"),
    branch: core.getInput("branch"),
    timezone: core.getInput("timezone"),
  });
  const { owner, repo } = context.repo;
  const git = new OctokitGitDataClient(getOctokit(token), owner, repo);
  const store = new GitHubStateStore(git, config.branch);
  await runComi(config, { store, now: () => new Date(), info: core.info });
}

main().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
