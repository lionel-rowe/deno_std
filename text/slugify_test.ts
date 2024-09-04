// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { assertEquals, assertMatch } from "@std/assert";
import { ASCII_DIACRITICS, DIACRITICS, NON_ASCII, slugify } from "./slugify.ts";
import { charMap } from "./slugify_char_map.ts";

Deno.test("slugify() returns kebabcase", () => {
  assertEquals(slugify("hello world"), "hello-world");
});
Deno.test("slugify() returns lowercase", () => {
  assertEquals(slugify("Hello World"), "hello-world");
});

Deno.test("slugify() handles whitespaces", () => {
  assertEquals(slugify("  Hello   World  "), "hello-world");
  assertEquals(slugify("Hello\tWorld"), "hello-world");
  assertEquals(slugify("Hello\nWorld"), "hello-world");
  assertEquals(slugify("Hello\r\nWorld"), "hello-world");
});

Deno.test("slugify() normalizes diacritic characters to NFC form by default", () => {
  assertEquals(slugify("déjà vu".normalize("NFD")), "déjà-vu".normalize("NFC"));
  assertEquals(slugify("Cliché".normalize("NFD")), "cliché".normalize("NFC"));
  assertEquals(slugify("façade".normalize("NFD")), "façade".normalize("NFC"));
  assertEquals(slugify("résumé".normalize("NFD")), "résumé".normalize("NFC"));
});

Deno.test("slugify() strips diacritics if using charMap", () => {
  assertEquals(slugify("déjà vu", { charMap: new Map() }), "deja-vu");
  assertEquals(slugify("Cliché", { charMap: new Map() }), "cliche");
  assertEquals(slugify("façade", { charMap: new Map() }), "facade");
  assertEquals(slugify("résumé", { charMap: new Map() }), "resume");
});

Deno.test("slugify() strips diacritics if strip: NON_ASCII", () => {
  assertEquals(slugify("déjà vu", { strip: NON_ASCII }), "deja-vu");
  assertEquals(slugify("Cliché", { strip: NON_ASCII }), "cliche");
  assertEquals(slugify("façade", { strip: NON_ASCII }), "facade");
  assertEquals(slugify("résumé", { strip: NON_ASCII }), "resume");
});

Deno.test("slugify() strips all diacritics if strip: DIACRITICS", () => {
  assertEquals(slugify("déjà vu", { strip: DIACRITICS }), "deja-vu");
  assertEquals(slugify("Cliché", { strip: DIACRITICS }), "cliche");
  assertEquals(slugify("façade", { strip: DIACRITICS }), "facade");
  assertEquals(slugify("résumé", { strip: DIACRITICS }), "resume");
  assertEquals(
    slugify("Συστημάτων Γραφής", { strip: DIACRITICS }),
    "συστηματων-γραφης",
  );
});

Deno.test("slugify() strips ASCII diacritics (but not other diacritics) if strip: ASCII_DIACRITICS", () => {
  assertEquals(slugify("déjà-vu", { strip: ASCII_DIACRITICS }), "deja-vu");
  assertEquals(
    slugify("Συστημάτων Γραφής", { strip: ASCII_DIACRITICS }),
    "συστημάτων-γραφής",
  );
});

Deno.test("slugify() handles dashes", () => {
  assertEquals(slugify("-Hello-World-"), "hello-world");
  assertEquals(slugify("--Hello--World--"), "hello-world");
});

Deno.test("slugify() converts empty string to a single dash", () => {
  // Prevent any issues with zero-length slugs in URLs, e.g.
  // `/a//b` -> `/a/b`; `/a/` -> `/a`
  assertEquals(slugify(""), "-");
});

Deno.test("slugify() replaces non-word characters with dashes", () => {
  assertEquals(slugify("Hello, world!"), "hello-world");
  assertEquals(slugify("hello ~ world"), "hello-world");

  assertEquals(
    slugify("Elon Musk considers move to Mars"),
    "elon-musk-considers-move-to-mars",
  );
  assertEquals(
    slugify("Fintech startups raised $34B in 2019"),
    "fintech-startups-raised-34b-in-2019",
  );
  assertEquals(
    slugify("Shopify joins Facebook’s cryptocurrency Libra Association"),
    "shopify-joins-facebooks-cryptocurrency-libra-association",
  );
  assertEquals(
    slugify("What is a slug and how to optimize it?"),
    "what-is-a-slug-and-how-to-optimize-it",
  );
  assertEquals(
    slugify("Bitcoin soars past $33,000, its highest ever"),
    "bitcoin-soars-past-33000-its-highest-ever",
  );
});

Deno.test("slugify() works with non-Latin alphabetic text", () => {
  assertEquals(slugify("Συστημάτων Γραφής"), "συστημάτων-γραφής");
  assertEquals(
    slugify("列车运行前方是惠新西街南口站"),
    "列车运行前方是惠新西街南口站",
  );
});

Deno.test("slugify() converts non-Latin text to ASCII if using ICU charMap", () => {
  assertEquals(slugify("Συστημάτων Γραφής", { charMap }), "sistimaton-grafis");
  assertEquals(
    slugify("列车运行前方是惠新西街南口站", { charMap }),
    "lieche-yunxing-qianfang-shi-hui-xin-xijie-nankou-zhan",
  );
});

Deno.test("slugify() works with custom charMap", () => {
  assertEquals(
    slugify(
      "A B C",
      { charMap: new Map([["a", "x"], ["b", "y"], ["c", "z"]]) },
    ),
    "x-y-z",
  );
});

Deno.test("slugify() deletes non-Latin text if using empty charMap", () => {
  assertEquals(slugify("Συστημάτων Γραφής", { charMap: new Map() }), "-");
  assertEquals(
    slugify("列车运行前方是惠新西街南口站", { charMap: new Map() }),
    "-",
  );
});

Deno.test("slugify() deletes non-Latin text when strip: NON_ASCII and no charMap is provided", () => {
  assertEquals(slugify("Συστημάτων Γραφής", { strip: NON_ASCII }), "-");
  assertEquals(
    slugify("列车运行前方是惠新西街南口站", { strip: NON_ASCII }),
    "-",
  );
});

Deno.test("slugify() deletes non-matches when a custom strip regex is supplied", () => {
  assertEquals(slugify("abcdef", { strip: /[ace]/g }), "bdf");
});

Deno.test("slugify() strips apostrophes within words", () => {
  assertEquals(slugify("What’s up?"), "whats-up");
  assertEquals(slugify("What's up?"), "whats-up");
});

Deno.test("slugify() strips or replaces all non-alphanumeric ASCII chars except for `-`", () => {
  // Ensure that interpolation into all parts of a URL (path segment, search
  // params, hash, subdomain, etc.) is safe, i.e. doesn't allow path traversal
  // or other exploits, which could be allowed by presence of chars like
  // `./?&=#` etc.

  const ASCII_LOWER_ALPHANUM_OR_DASH_ONLY = /^[a-z0-9\-]+$/;
  const ALL_ASCII = Array.from(
    { length: 0x80 },
    (_, i) => String.fromCharCode(i),
  ).join("");

  assertMatch(slugify(ALL_ASCII), ASCII_LOWER_ALPHANUM_OR_DASH_ONLY);
  // even if we explicitly set the strip regex to match nothing
  assertMatch(
    slugify(ALL_ASCII, { strip: /[^\s\S]/gu }),
    ASCII_LOWER_ALPHANUM_OR_DASH_ONLY,
  );
});
