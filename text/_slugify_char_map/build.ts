#!/usr/bin/env -S deno run -RWE
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import peggy from "npm:peggy@4.0.3";

const dir = Deno.env.get("ICU_DIR");
if (!dir) {
  throw new Error(
    "ICU_DIR env variable must be set (needs to be cloned/downloaded from https://github.com/unicode-org/icu/blob/main/icu4c/source/data/translit/",
  );
}

const sortAlphabetical = (a: string, b: string) => a.localeCompare(b, "en-US");

const dirEntries = (await Array.fromAsync(Deno.readDir(dir)))
  .sort((a, b) => sortAlphabetical(a.name, b.name));

function normalize(str: string): string {
  return str.trim().normalize("NFD").toLowerCase();
}

const parser = peggy.generate(
  await Deno.readTextFile("./text/_slugify_char_map/icu_parser.peggy"),
);

const map: Map<string, string> = new Map();

// order is important - each step builds on the previous ones
const mappingStepFileNameRegexes: RegExp[] = [
  // Indian languages must be converted via InterIndic, so we do that first
  /_InterIndic\.txt$/,
  /(?<!Grek)(?:_Latn|_Latin|_Latn_BGN)\.txt$/,
  /^Latin_ASCII\.txt$/,
]
  // We work backwards due to how we build the map, but conceptually conversion is "forward"
  // (e.g. Devanagari -> InterIndic -> Latin -> ASCII)
  .reverse();

for (const re of mappingStepFileNameRegexes) {
  const matched = dirEntries.filter((entry) => entry.name.match(re));
  for (const f of matched) {
    const path = `${dir}/${f.name}`;
    console.info(f.name);
    const source = await Deno.readTextFile(path);
    const result = parser.parse(source);

    for (const line of result.lines) {
      const { lhs: _lhs, rhs: _rhs } = line;

      for (let lhs of Array.isArray(_lhs) ? _lhs : [_lhs]) {
        lhs = normalize(lhs);
        const rhs = normalize(_rhs);

        if (!lhs) continue;

        map.set(lhs, rhs);

        if (map.has(rhs)) {
          map.set(lhs, map.get(rhs)!);
        }
      }
    }
  }
}

const NON_ASCII_ALPHANUM = /[^a-zA-Z0-9\-']/;

for (const [k, v] of map.entries()) {
  const vNormalized = v.normalize("NFKD").replaceAll(/[^\p{L}\p{N}]/gu, "");

  if (!NON_ASCII_ALPHANUM.test(k) && !NON_ASCII_ALPHANUM.test(v)) {
    // no point converting
    map.delete(k);
  } else if (!k || /[$()\[\]\-\+\*\?\{\},]/.test(k)) {
    map.delete(k);
  } else if (!vNormalized) {
    map.delete(k);
  } else if (NON_ASCII_ALPHANUM.test(vNormalized)) {
    map.delete(k);
  } else {
    map.set(k, vNormalized);
  }
}

const _out: Record<string, string[]> = {};

for (const [k, v] of map) {
  _out[v] ??= [];
  _out[v].push(k);
}

const out = Object.fromEntries(
  Object.entries(_out).sort(([a], [b]) => sortAlphabetical(a, b)).map((
    [k, v],
  ) => [
    k,
    [...new Set(v.flat().sort(sortAlphabetical))].join(","),
  ]),
);

await Deno.writeTextFile(
  "./text/_slugify_char_map/map.json",
  JSON.stringify(out, null, 2) + "\n",
);

// // For testing the parser
// const source = await Deno.readTextFile(`${dir}/${"Hani_Latn.txt"}`);
// const source = String.raw`
// $ejective = ’;
// $glottal  = ’;
// $pharyngeal = ‘;
// ጸ → ts $ejective e ; # ETHIOPIC SYLLABLE TSA
// ጹ → ts $ejective u ; # ETHIOPIC SYLLABLE TSU
// ጺ → ts $ejective ī ; # ETHIOPIC SYLLABLE TSI
// ጻ → ts $ejective a ; # ETHIOPIC SYLLABLE TSAA
// ጼ → ts $ejective ē ; # ETHIOPIC SYLLABLE TSEE
// ጽ → ts $ejective i ; # ETHIOPIC SYLLABLE TSE
// ጾ → ts $ejective o ; # ETHIOPIC SYLLABLE TSO

// ኺ → h\u0331ī ; # ETHIOPIC SYLLABLE KXI
// ኻ → h\u0331a ; # ETHIOPIC SYLLABLE KXAA
// ኼ → h\u0331ē ; # ETHIOPIC SYLLABLE KXEE
// ኽ → h\u0331i ; # ETHIOPIC SYLLABLE KXE
// `
// const result = parser.parse(source)
// console.info(result.lines)
