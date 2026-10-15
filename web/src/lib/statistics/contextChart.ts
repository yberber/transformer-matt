// The context-length chart's data and geometry: what one token costs when it reads n
// Positions, for every n the model can read, from the Estimates module.
import type { ModelConfig } from "../estimates/config";
import { decodeFlops } from "../estimates/flops";

/** One token reading `length` Positions: attention's two growing parts and everything else. */
export interface ContextCost {
  length: number;
  /** Everything that does not depend on the Positions read: the same at every length. */
  rest: number;
  scores: number;
  weightedSum: number;
  total: number;
}

/** The cost of one token reading `length` Positions. */
export function contextCost(config: ModelConfig, length: number): ContextCost {
  const { components, total } = decodeFlops(config, length);
  const { scores, weightedSum } = components;
  return { length, rest: total - scores - weightedSum, scores, weightedSum, total };
}

/** The cost of one token at every context length from 1 to n_positions. */
export function contextCosts(config: ModelConfig): ContextCost[] {
  return Array.from({ length: config.n_positions }, (_, i) => contextCost(config, i + 1));
}

/** The lengths the exact numbers are given at: every doubling up to `max`, and `current`. */
export function exactLengths(max: number, current: number): number[] {
  return [...new Set([...lengthTicks(max, 1), current])].sort((a, b) => a - b);
}

/** The length axis: logarithmic from 1 to `max`, so each doubling takes the same width. */
export function lengthScale(max: number, [left, right]: [number, number]) {
  const perDoubling = (right - left) / Math.log2(max);
  return {
    at: (length: number) => left + Math.log2(length) * perDoubling,
    /** The nearest length at a pixel, within 1 … max. */
    lengthAt: (x: number) => Math.min(max, Math.max(1, Math.round(2 ** ((x - left) / perDoubling)))),
  };
}

/** Lengths 1, 2, 4 … up to `max`, taking every `every`th doubling. */
export function lengthTicks(max: number, every: number): number[] {
  const doublings = Math.floor(Math.log2(max) / every);
  return Array.from({ length: doublings + 1 }, (_, i) => 2 ** (i * every));
}

/** Round values from 0 to the first round value at or above `max`, in about `count` steps of 1, 2 or 5 × 10^k. */
export function roundTicks(max: number, count: number): number[] {
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const multiple = [1, 2, 5, 10].find((m) => m * magnitude >= rough)!;
  // Whole multiples of the magnitude, so a share's ticks come out as 0.05, not 0.05000000000000001.
  return Array.from({ length: Math.ceil(max / (multiple * magnitude)) + 1 }, (_, i) => i * multiple * magnitude);
}
