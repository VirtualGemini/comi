// SPDX-License-Identifier: MIT
import { describe, expect, test } from "vitest";
import { renderPlaceholderCard } from "../../src/render/placeholder-card";
import { newCatState } from "../../src/state/state";

const NOW = new Date("2026-07-17T08:30:15Z");

describe("renderPlaceholderCard", () => {
  test("renders a 495x195 SVG per PRD §4 card size", () => {
    const svg = renderPlaceholderCard(newCatState("comi", NOW));
    expect(svg).toContain("<svg");
    expect(svg).toContain('width="495"');
    expect(svg).toContain('height="195"');
  });

  test("shows the cat name and the level", () => {
    const state = { ...newCatState("mochi", NOW), level: 5 };
    const svg = renderPlaceholderCard(state);
    expect(svg).toContain("mochi");
    expect(svg).toContain("Lv.5");
  });

  test("escapes XML special characters in the cat name", () => {
    const svg = renderPlaceholderCard(newCatState("Mo & Chi <3", NOW));
    expect(svg).toContain("Mo &amp; Chi &lt;3");
    expect(svg).not.toContain("Chi <3");
  });
});
