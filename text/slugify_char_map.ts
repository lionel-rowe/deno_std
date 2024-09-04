// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
import _charMap from "./_slugify_char_map.json" with { type: "json" };

/**
 * A mapping from non-Latin characters to their Latin equivalents, used for slugifying.
 */
export const charMap: Map<string, string> = new Map();
for (const x of Object.entries(_charMap)) {
  for (const y of x[1].split(",")) {
    charMap.set(y, x[0]);
  }
}
