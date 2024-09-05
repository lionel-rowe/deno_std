// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

const wordSegmenter = new Intl.Segmenter("en-US", { granularity: "word" });

/**
 * Options for {@linkcode slugify}.
 */
export type SlugifyOptions = {
  /**
   * The character map to use for transliteration.
   * @default {undefined}
   */
  charMap: Map<string, string> | undefined;
  /**
   * The regular expression to use for stripping characters.
   * @default {options.charMap ? NON_ASCII : NON_WORD}
   */
  strip: RegExp;
};

// cache so regex doesn't need to be recreated from scratch every time
const transliterationReCache = new WeakMap<Map<string, string>, RegExp>();
function getTransliterationRe(charMap: Map<string, string>) {
  if (transliterationReCache.has(charMap)) {
    return transliterationReCache.get(charMap)!;
  }

  if (!charMap.size) {
    // match nothing
    return /[^\s\S]/gu;
  }

  const re = new RegExp(
    // sort length descending to ensure longer substrings are matched first
    `(?:${[...charMap.keys()].sort((a, b) => b.length - a.length).join("|")})`,
    "gu",
  );

  transliterationReCache.set(charMap, re);
  return re;
}

type TransliterationConfig = {
  transliterate: true;
  charMap: Map<string, string>;
  re: RegExp;
} | {
  transliterate: false;
};

function convertWord(word: string, config: TransliterationConfig) {
  return config.transliterate
    ? word.replaceAll(config.re, (m) => config.charMap.get(m) ?? m)
    : word;
}

/**
 * A regular expression for stripping non-word characters from slugs.
 *
 * @example Usage
 * ```ts
 * import { NON_WORD, slugify } from "@std/text/slugify";
 * import { assertEquals } from "@std/assert";
 * assertEquals(slugify("déjà-vu", { strip: NON_WORD }), "déjà-vu");
 * assertEquals(slugify("Συστημάτων Γραφής", { strip: NON_WORD }), "συστημάτων-γραφής");
 * ```
 */
export const NON_WORD = /[^\p{L}\p{M}\p{N}\-]+/gu;
/**
 * A regular expression for stripping diacritics from slugs.
 *
 * @example Usage
 * ```ts
 * import { DIACRITICS, slugify } from "@std/text/slugify";
 * import { assertEquals } from "@std/assert";
 * assertEquals(slugify("déjà-vu", { strip: DIACRITICS }), "deja-vu");
 * assertEquals(slugify("Συστημάτων Γραφής", { strip: DIACRITICS }), "συστηματων-γραφης");
 * ```
 */
export const DIACRITICS = /[^\p{L}\p{N}\-]+/gu;
/**
 * A regular expression for stripping ASCII diacritics (but not other diacritics) from slugs.
 *
 * @example Usage
 * ```ts
 * import { ASCII_DIACRITICS, slugify } from "@std/text/slugify";
 * import { assertEquals } from "@std/assert";
 * assertEquals(slugify("déjà-vu", { strip: ASCII_DIACRITICS }), "deja-vu");
 * assertEquals(slugify("Συστημάτων Γραφής", { strip: ASCII_DIACRITICS }), "συστημάτων-γραφής");
 * ```
 */
export const ASCII_DIACRITICS = /(?<=[a-zA-Z])\p{M}+|[^\p{L}\p{M}\p{N}\-]+/gu;
/**
 * A regular expression for stripping non-ASCII characters from slugs.
 *
 * @example Usage
 * ```ts
 * import { NON_ASCII, slugify } from "@std/text/slugify";
 * import { assertEquals } from "@std/assert";
 * assertEquals(slugify("déjà-vu", { strip: NON_ASCII }), "deja-vu");
 * assertEquals(slugify("Συστημάτων Γραφής", { strip: NON_ASCII }), "-");
 * ```
 */
export const NON_ASCII = /[^0-9a-zA-Z\-]/g;

/**
 * Converts a string into a {@link https://en.wikipedia.org/wiki/Clean_URL#Slug | slug}.
 *
 * @experimental **UNSTABLE**: New API, yet to be vetted.
 *
 * @param input The string that is going to be converted into a slug
 * @param options The options for the slugify function
 * @returns The string as a slug
 *
 * @example Basic usage
 * ```ts
 * import { slugify } from "@std/text/slugify";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(slugify("Hello, world!"), "hello-world");
 * assertEquals(slugify("Συστημάτων Γραφής"), "συστημάτων-γραφής");
 * ```
 *
 * @example With transliteration using `charMap` option
 * ```ts
 * import { slugify } from "@std/text/slugify";
 * import { charMap } from "@std/text/slugify-char-map";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(slugify("Συστημάτων Γραφής", { charMap }), "sistimaton-grafis");
 * ```
 */
export function slugify(
  input: string,
  options?: Partial<SlugifyOptions>,
): string {
  const config: TransliterationConfig = options?.charMap
    ? {
      transliterate: true,
      charMap: options.charMap,
      re: getTransliterationRe(options.charMap),
    }
    : {
      transliterate: false,
    };

  // clone with `new RegExp` in case `lastIndex` isn't zeroed
  const stripRe = new RegExp(
    options?.strip ?? (config.transliterate ? NON_ASCII : NON_WORD),
  );

  const words: string[] = [];

  for (
    const s of wordSegmenter.segment(
      input.trim().normalize("NFD").toLowerCase(),
    )
  ) {
    if (s.isWordLike) {
      words.push(s.segment);
    } else if (s.segment.length) {
      words.push("-");
    }
  }

  return words
    .map((word) => convertWord(word, config))
    .join(config.transliterate ? "-" : "")
    .replaceAll(stripRe, "")
    .normalize("NFC")
    .replaceAll(/-{2,}/g, "-")
    .replaceAll(/^-|-$/g, "") ||
    "-";
}
