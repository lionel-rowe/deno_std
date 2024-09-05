#!/usr/bin/env -S deno run -RWE
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { escape as regExpEscape } from "@std/regexp";

// Builds up a simple char map using naive regex-based parsing of ICU source files.
// This won't give perfect transliteration results and could probably be
// improved upon significantly, but hopefully it's good enough for creating slugs.

const dir = Deno.env.get("ICU_DIR");
if (!dir) {
  throw new Error(
    "ICU_DIR env variable must be set (needs to be cloned/downloaded from https://github.com/unicode-org/icu/blob/main/icu4c/source/data/translit/",
  );
}

const sortAlphabetical = (a: string, b: string) => a.localeCompare(b, "en-US");

const x = (await Array.fromAsync(Deno.readDir(dir)))
  .sort((a, b) => sortAlphabetical(a.name, b.name));

function normalize(str: string) {
  return str.trim().normalize("NFD").toLowerCase();
}

function getSubMap(txt: string) {
  const lines = txt.split("\n");
  const _m = new Map<string, string>();

  function set(from: string, to: string) {
    // If `from` contains only diacritics from Latin/unspecified scripts, we ignore the entry
    // (to avoid e.g. acute accent having a value assigned, which messes up results for
    // common European languages)
    if (
      /^[\p{M}&&[\p{scx=Latn}\p{scx=Inherited}\p{scx=Common}]]+$/v.test(from)
    ) {
      return;
    }

    _m.set(from, to);
  }

  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^\s*#/.test(line)) continue;

    const content = line.match(/^.+?(?=#|(?<=[^']);|\$|$)/)?.[0];
    if (!content) continue;

    const forwardOrBidi = /[→↔]/;

    const _content = content.split(forwardOrBidi).map(normalize);

    if (!_content[0] || !_content[1]) continue;

    const x = {
      from: normalize(_content[0]),
      to: normalize(_content[1]),
    };

    if (x.to == null) continue;

    for (const [_k, v] of Object.entries(x)) {
      const k = _k as keyof typeof x;

      if (/^'[^']+'$/.test(v)) {
        x[k] = v.slice(1, -1);
      }

      try {
        x[k] = JSON.parse(`"${v}"`);
      } catch { /* ignore */ }
    }

    x.to = x.to.replaceAll(/\p{M}/gu, "");

    if (!x.from || !x.to) continue;
    // if `to` contains non-ASCII-word chars
    if (/[^0-9a-zA-Z\-]/.test(x.to)) continue;
    // if `from` contains ASCII other than word chars, square brackets, and hyphens
    if (/[[\0-~]--[\p{L}\p{M}\p{N}\[\]\-]]/v.test(x.from)) continue;

    if (/^\[.+\]$/u.test(x.from)) {
      for (const [ch] of x.from.slice(1, -1).matchAll(/.-.|./gu)) {
        if ([...ch].length === 3) {
          // is range w hyphen
          const [from, to] = ch.split("-").map((x) => x.codePointAt(0)!);
          for (let i = from!; i <= to!; i++) {
            const ch = String.fromCodePoint(i);
            if (/[\p{L}\p{M}\p{N}]/u.test(ch)) {
              set(ch, x.to);
            }
          }
        } else {
          set(ch, x.to);
        }
      }
    } else {
      if (/[\[\]]/.test(x.from)) continue;
      set(x.from, x.to);
    }
  }
  return _m;
}

let ascii: Map<string, string>;
let asciiRe: RegExp;

{
  const f = x.find((f) => f.isFile && f.name === "Latin_ASCII.txt")!;
  const path = `${dir}/${f.name}`;
  const r = await Deno.readTextFile(path);
  ascii = getSubMap(r);
  asciiRe = new RegExp(
    `(?:${Array.from(ascii.keys()).map((k) => regExpEscape(k)).join("|")})`,
    "gu",
  );
}

const all = new Map<string, string>();

const suffixes = [
  "_Latn.txt",
  "_Latin.txt",
  "_Latn_BGN.txt",
];

const ignores = [
  // Ancient Greek - prefer el_el_Latn_BGN.txt
  "Grek_Latn.txt",
];

for (const f of x) {
  if (!f.isFile) continue;
  if (ignores.includes(f.name)) continue;

  if (!suffixes.some((suf) => f.name.endsWith(suf))) continue;

  const path = `${dir}/${f.name}`;
  const r = await Deno.readTextFile(path);
  const m = getSubMap(r);

  for (const [k, v] of m) {
    all.set(
      k,
      normalize(v).replaceAll(/\p{M}/gu, "").replaceAll(
        asciiRe,
        (m) => ascii.get(m) ?? m,
      ),
    );
  }
}

for (const [k, v] of ascii) {
  all.set(normalize(k), v);
}

const outRev: Record<string, string[]> = Object.create(null);

for (const [k, v] of all) {
  outRev[v] ??= [];
  outRev[v].push(k);
}

const allOut = Object.entries(outRev)
  .sort(([a], [b]) => sortAlphabetical(a, b))
  .map(([k, v]) => [k, v.sort(sortAlphabetical).join(",")] as const);

await Deno.writeTextFile(
  "./text/_slugify_char_map.json",
  JSON.stringify(Object.fromEntries(allOut), null, 2) + "\n",
);
