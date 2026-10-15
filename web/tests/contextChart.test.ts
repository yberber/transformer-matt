// The context-length chart: what one token costs when it reads n Positions, for n from 1 to
// n_positions, against values computed by hand (see flops.test.ts). Everything but attention
// is the same at every length: 12 × 14,155,776 + 77,194,752 = 247,064,064 FLOPs. Attention
// scores and the weighted sum each cost 12 × 1,536 = 18,432 FLOPs per Position read.
import { describe, expect, it } from "vitest";
import { GPT2_CONFIG } from "../src/lib/estimates/config";
import { contextCosts, roundTicks, exactLengths, lengthScale, lengthTicks } from "../src/lib/statistics/contextChart";

describe("the cost of one token by context length", () => {
  const costs = contextCosts(GPT2_CONFIG);

  it("covers every length from 1 to n_positions, 1024", () => {
    expect(costs).toHaveLength(1024);
    expect(costs[0]!.length).toBe(1);
    expect(costs.at(-1)!.length).toBe(1024);
  });

  it("reading 1 Position", () => {
    expect(costs[0]).toEqual({ length: 1, rest: 247_064_064, scores: 18_432, weightedSum: 18_432, total: 247_100_928 });
  });

  it("reading 1024 Positions: attention scores are 6.6% of the token's FLOPs", () => {
    expect(costs[1023]).toEqual({
      length: 1024,
      rest: 247_064_064,
      scores: 18_874_368,
      weightedSum: 18_874_368,
      total: 284_812_800,
    });
  });
});

describe("the exact numbers behind the chart", () => {
  it("are at every doubling and at this text's length, in order", () => {
    expect(exactLengths(1024, 17)).toEqual([1, 2, 4, 8, 16, 17, 32, 64, 128, 256, 512, 1024]);
  });

  it("list a length that is a doubling once", () => {
    expect(exactLengths(1024, 64)).toEqual([1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]);
  });
});

describe("the logarithmic length axis", () => {
  // 1 … 1024 is ten doublings, so on a 500-pixel axis each doubling takes 50 pixels.
  const x = lengthScale(1024, [0, 500]);

  it("places each doubling the same distance further", () => {
    expect(x.at(1)).toBe(0);
    expect(x.at(2)).toBeCloseTo(50);
    expect(x.at(32)).toBeCloseTo(250);
    expect(x.at(1024)).toBe(500);
  });

  it("reads back the nearest length at a pixel, within 1 … 1024", () => {
    expect(x.lengthAt(250)).toBe(32);
    expect(x.lengthAt(251)).toBe(32);
    expect(x.lengthAt(-20)).toBe(1);
    expect(x.lengthAt(600)).toBe(1024);
  });
});

describe("ticks", () => {
  it("mark every doubling of the length, or every other one when space is short", () => {
    expect(lengthTicks(1024, 1)).toEqual([1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]);
    expect(lengthTicks(1024, 2)).toEqual([1, 4, 16, 64, 256, 1024]);
  });

  it("mark a round share from 0 up past the longest context's attention share", () => {
    // Attention scores and weighted sum at 1024 Positions: 37,748,736 of 284,812,800, 13.3%.
    expect(roundTicks(0.1325, 3)).toEqual([0, 0.05, 0.1, 0.15]);
  });

  it("mark round FLOPs from 0 up past the longest context's cost", () => {
    expect(roundTicks(284_812_800, 3)).toEqual([0, 100_000_000, 200_000_000, 300_000_000]);
    expect(roundTicks(284_812_800, 6)).toEqual([0, 50_000_000, 100_000_000, 150_000_000, 200_000_000, 250_000_000, 300_000_000]);
  });
});
