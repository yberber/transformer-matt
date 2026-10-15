// FLOPs Estimates for GPT-2 small, against values computed by hand from its config:
// n_embd d = 768, n_layer L = 12, vocab_size V = 50257, the MLP 4d = 3072 wide.
// Matrix multiplications only, 2 FLOPs per multiply-add. For one token reading n Positions:
//   QKV 2·768·2304 = 3,538,944; scores and weighted sum 2·768·n = 1,536n each;
//   output projection 2·768·768 = 1,179,648; MLP 2·768·3072·2 = 9,437,184 per layer;
//   LM head 2·768·50257 = 77,194,752; embedding lookups 0.
import { describe, expect, it } from "vitest";
import { GPT2_CONFIG } from "../src/lib/estimates/config";
import { COMPONENTS, decodeFlops, prefillFlops, textFlops } from "../src/lib/estimates/flops";

describe("decoding one token", () => {
  it("reading only itself costs 247,100,928 FLOPs", () => {
    // 12 × (14,155,776 + 2 × 1,536) + 77,194,752
    expect(decodeFlops(GPT2_CONFIG, 1).total).toBe(247_100_928);
  });

  it("reading 10 Positions, by component over the whole model", () => {
    const flops = decodeFlops(GPT2_CONFIG, 10);
    expect(flops.components).toEqual({
      embeddings: 0,
      qkv: 42_467_328, // 12 × 3,538,944
      scores: 184_320, // 12 × 1,536 × 10
      weightedSum: 184_320,
      outputProjection: 14_155_776, // 12 × 1,179,648
      mlp: 113_246_208, // 12 × 9,437,184
      lmHead: 77_194_752,
    });
    expect(flops.total).toBe(247_432_704);
  });

  it("reading 10 Positions, in one layer: every layer costs the same", () => {
    const flops = decodeFlops(GPT2_CONFIG, 10);
    expect(flops.perLayer).toEqual({
      qkv: 3_538_944,
      scores: 15_360,
      weightedSum: 15_360,
      outputProjection: 1_179_648,
      mlp: 9_437_184,
    });
    expect(flops.layer).toBe(14_186_496);
    expect(flops.layers).toBe(12);
  });
});

describe("prefill of a 10-token Prompt", () => {
  // The Prompt's tokens read 1, 2, … 10 Positions under the causal mask: 55 in all.
  const flops = prefillFlops(GPT2_CONFIG, 10);

  it("costs 2,472,668,160 FLOPs", () => {
    // 10 × (12 × 14,155,776 + 77,194,752) + 12 × 2 × 1,536 × 55
    expect(flops.total).toBe(2_472_668_160);
  });

  it("by component, the LM head scoring every Position", () => {
    expect(flops.components).toEqual({
      embeddings: 0,
      qkv: 424_673_280,
      scores: 1_013_760, // 12 × 1,536 × 55
      weightedSum: 1_013_760,
      outputProjection: 141_557_760,
      mlp: 1_132_462_080,
      lmHead: 771_947_520,
    });
  });

  it("in one layer", () => {
    expect(flops.perLayer).toEqual({
      qkv: 35_389_440,
      scores: 84_480,
      weightedSum: 84_480,
      outputProjection: 11_796_480,
      mlp: 94_371_840,
    });
    expect(flops.layer).toBe(141_726_720);
  });
});

it("prefill costs the sum of decoding each prefix length", () => {
  for (const length of [1, 2, 7, 64, 1024]) {
    const decodes = Array.from({ length }, (_, i) => decodeFlops(GPT2_CONFIG, i + 1));
    const prefill = prefillFlops(GPT2_CONFIG, length);
    expect(prefill.total, `${length} tokens`).toBe(decodes.reduce((total, decode) => total + decode.total, 0));
    for (const part of COMPONENTS) {
      expect(prefill.components[part], `${part}, ${length} tokens`).toBe(
        decodes.reduce((total, decode) => total + decode.components[part], 0),
      );
    }
  }
});

describe("the current text: a 10-token Prompt after 3 Steps", () => {
  const flops = textFlops(GPT2_CONFIG, 10, 3);

  it("prefills the Prompt", () => {
    expect(flops.prefill.total).toBe(2_472_668_160);
  });

  it("decodes each Step's token, reading 11, 12 and 13 Positions", () => {
    // 3 × (12 × 14,155,776 + 77,194,752) + 12 × 2 × 1,536 × (11 + 12 + 13)
    expect(flops.decode.total).toBe(742_519_296);
    expect(flops.decode.components.scores).toBe(663_552); // 12 × 1,536 × 36
    expect(flops.decode.perLayer.mlp).toBe(28_311_552); // 3 × 9,437,184
  });

  it("costs both together", () => {
    expect(flops.total.total).toBe(3_215_187_456);
    expect(flops.total.components.lmHead).toBe(1_003_531_776); // 13 × 77,194,752
    expect(flops.total.perLayer.scores).toBe(139_776); // 1,536 × 91
  });

  it("before any Step, decodes nothing", () => {
    const prompt = textFlops(GPT2_CONFIG, 10, 0);
    expect(prompt.decode.total).toBe(0);
    expect(prompt.total.total).toBe(2_472_668_160);
  });
});
