// SPDX-License-Identifier: MIT
import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { OctokitEventsClient } from "./collect/octokit-events-client";
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
  const octokit = getOctokit(token);
  const git = new OctokitGitDataClient(octokit, owner, repo);
  const store = new GitHubStateStore(git, config.branch);
  const events = new OctokitEventsClient(octokit, owner);
  await runComi(config, { store, events, owner, now: () => new Date(), info: core.info });
}

main().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
