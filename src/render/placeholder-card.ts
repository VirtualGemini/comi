// SPDX-License-Identifier: MIT
import type { CatState } from "../state/state";

export const CARD_WIDTH = 495;
export const CARD_HEIGHT = 195;

/**
 * Renders the placeholder card: a static frame that proves the state pipeline
 * end to end. The animated pixel cat replaces it in ticket 04.
 */
export function renderPlaceholderCard(state: CatState): string {
  const name = escapeXml(state.cat_name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${name}">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="10" fill="#24292f"/>
  <rect x="52" y="62" width="72" height="72" fill="#f6a04d"/>
  <rect x="52" y="46" width="16" height="16" fill="#f6a04d"/>
  <rect x="108" y="46" width="16" height="16" fill="#f6a04d"/>
  <text x="200" y="86" font-family="Verdana, sans-serif" font-size="22" font-weight="bold" fill="#f0f6fc">${name}</text>
  <text x="200" y="120" font-family="Verdana, sans-serif" font-size="16" fill="#f0f6fc">Lv.${state.level}</text>
</svg>
`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
