// SPDX-License-Identifier: MIT
import { describe, expect, test } from "vitest";
import { resolveConfig } from "../src/config";

describe("resolveConfig", () => {
  test("falls back to PRD §7 defaults when inputs are unset", () => {
    expect(resolveConfig({})).toEqual({
      catName: "comi",
      lang: "en",
      branch: "pet",
      timezone: "UTC",
    });
  });

  test("treats empty input strings as unset", () => {
    expect(resolveConfig({ catName: "", lang: "", branch: "", timezone: "" })).toEqual({
      catName: "comi",
      lang: "en",
      branch: "pet",
      timezone: "UTC",
    });
  });

  test("uses configured values when provided", () => {
    expect(
      resolveConfig({ catName: "mochi", lang: "ja", branch: "cat-state", timezone: "Asia/Tokyo" }),
    ).toEqual({
      catName: "mochi",
      lang: "ja",
      branch: "cat-state",
      timezone: "Asia/Tokyo",
    });
  });

  test("trims surrounding whitespace from inputs", () => {
    expect(resolveConfig({ catName: "  mochi  " }).catName).toBe("mochi");
  });
});
