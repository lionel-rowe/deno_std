// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import type { Comparator, SemVer } from "./types.ts";

/**
 * MAX is a sentinel value used by some range calculations.
 * It is equivalent to `∞.∞.∞`.
 */
export const MAX: SemVer = {
  major: Number.POSITIVE_INFINITY,
  minor: Number.POSITIVE_INFINITY,
  patch: Number.POSITIVE_INFINITY,
  prerelease: [],
  build: [],
};

/**
 * The minimum valid SemVer object. Equivalent to `0.0.0`.
 */
export const MIN: SemVer = {
  major: 0,
  minor: 0,
  patch: 0,
  prerelease: [],
  build: [],
};

/**
 * A sentinel value used to denote an invalid SemVer object
 * which may be the result of impossible ranges or comparator operations.
 */
export const INVALID: SemVer = {
  major: Number.NEGATIVE_INFINITY,
  minor: Number.POSITIVE_INFINITY,
  patch: Number.POSITIVE_INFINITY,
  prerelease: [],
  build: [],
};

/**
 * ANY is a sentinel value used by some range calculations. It is not a valid
 * SemVer object and should not be used directly.
 */
export const ANY: SemVer = {
  major: Number.NaN,
  minor: Number.NaN,
  patch: Number.NaN,
  prerelease: [],
  build: [],
};

/**
 * A comparator which will span all valid semantic versions
 */
export const ALL: Comparator = {
  operator: undefined,
  ...ANY,
};

export const OPERATORS = [
  undefined,
  "=",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
] as const;
