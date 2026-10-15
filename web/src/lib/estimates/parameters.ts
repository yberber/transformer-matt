// Every parameter tensor of GPT-2, its shape and parameter count, derived from the config.
// Shapes follow Hugging Face's GPT-2: embeddings are rows × width, and the block's
// projections are Conv1D weights stored as inputs × outputs.
import type { ModelConfig } from "./config";

/** A model part that owns parameters, named as in Hugging Face's GPT-2. */
export type Part = "wte" | "wpe" | "ln_1" | "attn.c_attn" | "attn.c_proj" | "ln_2" | "mlp.c_fc" | "mlp.c_proj" | "ln_f";

export interface Tensor {
  part: Part;
  kind: "weight" | "bias";
  /** Hugging Face's parameter name, without "transformer." and, in a block, without "h.<layer>.". */
  name: string;
  shape: number[];
  count: number;
}

export interface Parameters {
  /** The token and position embeddings, before the first block. */
  embeddings: Tensor[];
  embeddingsTotal: number;
  /** One block's tensors, in the order the block uses them; every block has the same. */
  block: Tensor[];
  layers: number;
  perBlock: number;
  blocksTotal: number;
  /** The MLP's inner width, which its up projection widens each token to. */
  mlpWidth: number;
  /** How the fused QKV matrix's outputs split: Q, K and V, each into heads of headWidth. */
  qkv: { heads: number; headWidth: number };
  /** The final LayerNorm, after the last block. */
  final: Tensor[];
  finalTotal: number;
  /**
   * The LM head's weight. It is the token embedding's matrix (tied weights), used to score
   * every token, so it adds no parameters of its own.
   */
  lmHead: { name: string; shape: number[]; tiedTo: Tensor };
  /** Every parameter, the LM head counted once (as the token embedding). */
  total: number;
}

function tensor(part: Part, kind: Tensor["kind"], shape: number[]): Tensor {
  return { part, kind, name: `${part}.${kind}`, shape, count: shape.reduce((a, b) => a * b, 1) };
}

function linear(part: Part, inputs: number, outputs: number): Tensor[] {
  return [tensor(part, "weight", [inputs, outputs]), tensor(part, "bias", [outputs])];
}

function layerNorm(part: Part, width: number): Tensor[] {
  return [tensor(part, "weight", [width]), tensor(part, "bias", [width])];
}

function sum(tensors: Tensor[]): number {
  return tensors.reduce((total, { count }) => total + count, 0);
}

export function parameters(config: ModelConfig): Parameters {
  const { vocab_size: vocabulary, n_positions: positions, n_embd: width, n_layer: layers, n_head: heads } = config;
  // GPT-2's MLP is 4 × n_embd wide; its config leaves n_inner unset to mean exactly that.
  const inner = 4 * width;

  const wte = tensor("wte", "weight", [vocabulary, width]);
  const embeddings = [wte, tensor("wpe", "weight", [positions, width])];
  const block = [
    ...layerNorm("ln_1", width),
    ...linear("attn.c_attn", width, 3 * width),
    ...linear("attn.c_proj", width, width),
    ...layerNorm("ln_2", width),
    ...linear("mlp.c_fc", width, inner),
    ...linear("mlp.c_proj", inner, width),
  ];
  const final = layerNorm("ln_f", width);
  const perBlock = sum(block);
  const [embeddingsTotal, blocksTotal, finalTotal] = [sum(embeddings), layers * perBlock, sum(final)];

  return {
    embeddings,
    embeddingsTotal,
    block,
    layers,
    perBlock,
    blocksTotal,
    mlpWidth: inner,
    qkv: { heads, headWidth: width / heads },
    final,
    finalTotal,
    lmHead: { name: "lm_head.weight", shape: [vocabulary, width], tiedTo: wte },
    total: embeddingsTotal + blocksTotal + finalTotal,
  };
}
