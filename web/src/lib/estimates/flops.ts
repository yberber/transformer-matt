// FLOPs Estimates: what GPT-2 computes for each token, counted from the config's shapes.
// The counting rule: matrix multiplications only, 2 FLOPs per multiply-add. Softmax,
// LayerNorm, GELU, residual and bias adds are left out; an embedding lookup copies a row,
// so it counts 0.
import type { ModelConfig } from "./config";
import { parameters } from "./parameters";

/** The parts of a transformer block that multiply matrices, in the order the block runs them. */
export const BLOCK_COMPONENTS = ["qkv", "scores", "weightedSum", "outputProjection", "mlp"] as const;
export type BlockComponent = (typeof BLOCK_COMPONENTS)[number];

/** Every component of the breakdown, in model order: the embeddings, the blocks', the LM head. */
export const COMPONENTS = ["embeddings", ...BLOCK_COMPONENTS, "lmHead"] as const;
export type Component = (typeof COMPONENTS)[number];

export interface Flops {
  /** One layer's FLOPs by component; every layer costs the same. */
  perLayer: Record<BlockComponent, number>;
  /** One layer's FLOPs. */
  layer: number;
  layers: number;
  /** Each component over the whole model: a block component in all layers together. */
  components: Record<Component, number>;
  total: number;
}

const MULTIPLY_ADD = 2;

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * The FLOPs of running `tokens` tokens through the whole model, which between them read
 * `positionsRead` Positions. Only attention depends on the Positions a token reads.
 */
function countFlops(config: ModelConfig, tokens: number, positionsRead: number): Flops {
  const { vocab_size: vocabulary, n_embd: width, n_layer: layers } = config;
  const inner = parameters(config).mlpWidth;
  // Each head compares its query with every Position's key, then sums every Position's value;
  // the heads' widths add up to n_embd, so each costs n_embd multiply-adds per Position read.
  const perLayer: Record<BlockComponent, number> = {
    qkv: MULTIPLY_ADD * tokens * width * 3 * width,
    scores: MULTIPLY_ADD * width * positionsRead,
    weightedSum: MULTIPLY_ADD * width * positionsRead,
    outputProjection: MULTIPLY_ADD * tokens * width * width,
    mlp: MULTIPLY_ADD * tokens * (width * inner + inner * width),
  };
  const components: Record<Component, number> = {
    embeddings: 0,
    ...(Object.fromEntries(BLOCK_COMPONENTS.map((part) => [part, layers * perLayer[part]])) as Record<
      BlockComponent,
      number
    >),
    // The LM head scores every token in the vocabulary, in full, at every Position.
    lmHead: MULTIPLY_ADD * tokens * width * vocabulary,
  };
  return { perLayer, layer: sum(Object.values(perLayer)), layers, components, total: sum(Object.values(components)) };
}

/**
 * The Positions `tokens` consecutive tokens read between them under the causal mask, when
 * `before` tokens come first: before + 1, before + 2, … before + tokens.
 */
function positionsRead(before: number, tokens: number): number {
  return tokens * before + (tokens * (tokens + 1)) / 2;
}

/** One token through the whole model, when it reads `positions` Positions (itself included). */
export function decodeFlops(config: ModelConfig, positions: number): Flops {
  return countFlops(config, 1, positions);
}

/**
 * A Prompt of `length` tokens through the whole model in one go. Under the causal mask its
 * tokens read 1, 2, … `length` Positions, so this is exactly the sum of decoding each prefix.
 */
export function prefillFlops(config: ModelConfig, length: number): Flops {
  return countFlops(config, length, positionsRead(0, length));
}

/** The cost of the text so far: its Prompt's prefill, its Steps' decodes, and both together. */
export interface TextFlops {
  prefill: Flops;
  decode: Flops;
  total: Flops;
}

/**
 * A Prompt of `promptLength` tokens prefilled, then `steps` Steps taken. Each Step's token is
 * decoded once, reading the Prompt, the Steps before it and itself.
 */
export function textFlops(config: ModelConfig, promptLength: number, steps: number): TextFlops {
  const prefillRead = positionsRead(0, promptLength);
  const decodeRead = positionsRead(promptLength, steps);
  return {
    prefill: countFlops(config, promptLength, prefillRead),
    decode: countFlops(config, steps, decodeRead),
    total: countFlops(config, promptLength + steps, prefillRead + decodeRead),
  };
}
