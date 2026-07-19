// SPDX-License-Identifier: MIT
import { describe, expect, test } from "vitest";
import { passesGuards } from "../../src/collect/guards";
import { event } from "./fixtures";

const OWNER = "mona";

describe("passesGuards (PRD §3.3)", () => {
  test("counts an event the owner performed in a regular repository", () => {
    expect(passesGuards(event({ actor: "mona", repo: "mona/hello-world" }), OWNER)).toBe(true);
  });

  test("rejects an event performed by someone other than the owner", () => {
    expect(passesGuards(event({ actor: "someone-else" }), OWNER)).toBe(false);
  });

  test("matches the actor login case-insensitively, as GitHub logins are", () => {
    expect(passesGuards(event({ actor: "Mona" }), OWNER)).toBe(true);
  });

  test("rejects an event on the profile repository itself", () => {
    expect(passesGuards(event({ repo: "mona/mona" }), OWNER)).toBe(false);
  });

  test("matches the profile repository case-insensitively", () => {
    expect(passesGuards(event({ repo: "Mona/Mona" }), OWNER)).toBe(false);
  });

  test("rejects an event performed by a bot identity", () => {
    expect(passesGuards(event({ actor: "mona[bot]" }), "mona[bot]")).toBe(false);
  });
});
