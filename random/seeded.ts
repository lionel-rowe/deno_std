// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { fromSeed, nextU32, seedFromU64 } from "./_pcg32.ts";
import type { Prng } from "./_types.ts";

/**
 * Creates a pseudo-random number generator that generates random numbers in
 * the range `[0, 1)`, based on the given seed.
 *
 * @param seed The seed used to initialize the random number generator's state.
 * @returns A pseudo-random number generator function, which will generate
 * different random numbers on each call.
 *
 * @example Usage
 * ```ts
 * import { randomSeeded } from "@std/random";
 * import { assertEquals } from "@std/assert";
 *
 * const prng = randomSeeded(1n);
 *
 * assertEquals(prng(), 0.20176767697557807);
 * assertEquals(prng(), 0.4911644416861236);
 * assertEquals(prng(), 0.7924694607499987);
 * ```
 */
export function randomSeeded(seed: bigint): Prng {
  const pcg = fromSeed(seedFromU64(seed, 16));
  return () => uint32ToFloat64(nextU32(pcg));
}

/**
 * Convert a 32-bit unsigned integer to a float64 in the range `[0, 1)`.
 * This operation is lossless, i.e. it's always possible to get the original
 * value back by multiplying by 2 ** 32.
 */
function uint32ToFloat64(u32: number): number {
  return u32 / (2 ** 32);
}
