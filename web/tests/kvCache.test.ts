// The KV cache's size for GPT-2 small, against values computed by hand: every layer keeps a
// key and a value of n_embd = 768 float32 numbers (4 bytes each) per Position.
import { expect, it } from "vitest";
import { GPT2_CONFIG } from "../src/lib/estimates/config";
import { kvCacheBytes } from "../src/lib/estimates/kvCache";

it("holds 73,728 bytes per Position: 12 layers × (K + V) × 768 × 4 bytes", () => {
  expect(kvCacheBytes(GPT2_CONFIG, 1).total).toBe(73_728);
});

it("for 10 Positions, by layer", () => {
  expect(kvCacheBytes(GPT2_CONFIG, 10)).toEqual({
    keys: 30_720, // 10 × 768 × 4
    values: 30_720,
    perLayer: 61_440,
    layers: 12,
    total: 737_280,
  });
});

it("at the full context of 1,024 Positions", () => {
  expect(kvCacheBytes(GPT2_CONFIG, 1024).total).toBe(75_497_472);
});
