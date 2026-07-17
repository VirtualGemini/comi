// SPDX-License-Identifier: MIT

/** Resolved run configuration; defaults follow PRD §7. */
export interface ComiConfig {
  catName: string;
  lang: string;
  branch: string;
  timezone: string;
}

export interface RawInputs {
  catName?: string;
  lang?: string;
  branch?: string;
  timezone?: string;
}

const DEFAULTS: ComiConfig = {
  catName: "comi",
  lang: "en",
  branch: "pet",
  timezone: "UTC",
};

export function resolveConfig(raw: RawInputs): ComiConfig {
  return {
    catName: valueOrDefault(raw.catName, DEFAULTS.catName),
    lang: valueOrDefault(raw.lang, DEFAULTS.lang),
    branch: valueOrDefault(raw.branch, DEFAULTS.branch),
    timezone: valueOrDefault(raw.timezone, DEFAULTS.timezone),
  };
}

function valueOrDefault(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? fallback : trimmed;
}
