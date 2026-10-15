// Parameter counts from the official GPT-2 small config, against values computed by hand.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GPT2_CONFIG } from "../src/lib/estimates/config";
import { parameters } from "../src/lib/estimates/parameters";

const model = parameters(GPT2_CONFIG);

it("GPT-2 small has 124,439,808 parameters, with the LM head counted once", () => {
  expect(model.total).toBe(124_439_808);
});

// name, shape, parameter count: worked out by hand from vocab_size 50257, n_positions 1024,
// n_embd 768 and the MLP's 4 × 768 = 3072.
describe("every tensor's shape and parameter count", () => {
  it("embeddings", () => {
    expect(model.embeddings.map(({ name, shape, count }) => [name, shape, count])).toEqual([
      ["wte.weight", [50257, 768], 38_597_376],
      ["wpe.weight", [1024, 768], 786_432],
    ]);
    expect(model.embeddingsTotal).toBe(39_383_808);
  });

  it("one block, the same in each of the 12", () => {
    expect(model.block.map(({ name, shape, count }) => [name, shape, count])).toEqual([
      ["ln_1.weight", [768], 768],
      ["ln_1.bias", [768], 768],
      ["attn.c_attn.weight", [768, 2304], 1_769_472],
      ["attn.c_attn.bias", [2304], 2304],
      ["attn.c_proj.weight", [768, 768], 589_824],
      ["attn.c_proj.bias", [768], 768],
      ["ln_2.weight", [768], 768],
      ["ln_2.bias", [768], 768],
      ["mlp.c_fc.weight", [768, 3072], 2_359_296],
      ["mlp.c_fc.bias", [3072], 3072],
      ["mlp.c_proj.weight", [3072, 768], 2_359_296],
      ["mlp.c_proj.bias", [768], 768],
    ]);
    expect(model.layers).toBe(12);
    expect(model.perBlock).toBe(7_087_872);
    expect(model.blocksTotal).toBe(85_054_464);
    expect(model.mlpWidth).toBe(3072);
  });

  it("the final LayerNorm", () => {
    expect(model.final.map(({ name, shape, count }) => [name, shape, count])).toEqual([
      ["ln_f.weight", [768], 768],
      ["ln_f.bias", [768], 768],
    ]);
    expect(model.finalTotal).toBe(1536);
  });
});

it("the LM head is the token embedding's matrix, so it adds no parameters", () => {
  expect(model.lmHead.name).toBe("lm_head.weight");
  expect(model.lmHead.shape).toEqual([50257, 768]);
  expect(model.lmHead.tiedTo.name).toBe("wte.weight");
  // 38,597,376 + 786,432 + 12 × 7,087,872 + 1,536: the LM head's 38,597,376 are not added again.
  expect(model.total).toBe(38_597_376 + 786_432 + 85_054_464 + 1536);
});

it("the fused QKV matrix's 2304 outputs are Q, K and V, each 12 heads of 64", () => {
  expect(model.qkv).toEqual({ heads: 12, headWidth: 64 });
});

it("the config is the one every Example was built with", () => {
  const dir = new URL("../public/data/examples/", import.meta.url);
  for (const name of readdirSync(dir).filter((file) => file.endsWith(".json"))) {
    const { header } = JSON.parse(readFileSync(new URL(name, dir), "utf-8"));
    expect(GPT2_CONFIG, name).toMatchObject(header.config);
  }
});
