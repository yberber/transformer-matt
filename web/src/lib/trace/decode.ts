// The one Trace decoder: Example files and Live API responses share this path (ADR 0001).
import type * as Wire from "./trace.generated";

export type TraceHeader = Wire.TraceHeader;

export interface Token {
  tokenId: number;
  tokenText: string;
  tokenBytes: Uint8Array;
}

export interface Prediction extends Token {
  /** float32, over the whole vocabulary. */
  probability: number;
}

/** An embedding vector. */
export interface Embedding {
  /** Every dimension, to within half a step of the vector's int8 scale: enough to draw, not to read off. */
  values: Float32Array;
  /** The first few dimensions, exactly (float32). */
  firstDimensions: number[];
  /** The Euclidean norm of the whole vector, exactly (float32). */
  norm: number;
}

/** Attention weights travel as round(weight × 255), so each is within 1/510 of the model's own. */
export const ATTENTION_STEPS = 255;

export interface PositionRecord extends Token {
  /** The token's row of the token embedding table. */
  tokenEmbedding: Embedding;
  /** This Position's row of the position embedding table. */
  positionEmbedding: Embedding;
  /**
   * This Position's attention rows, `attention[layer][head][key]`: the weight it gives
   * each Position `key` from 0 to itself, a multiple of 1/ATTENTION_STEPS.
   */
  attention: Float32Array[][];
  /**
   * How strongly each layer's MLP changed this Position, `mlpImpact[layer]`: the norm of
   * the MLP's output over the norm of the residual stream it is added to (float32).
   */
  mlpImpact: number[];
  /**
   * The logit lens, `logitLens[layer]`: the top-5 next tokens the model would predict here
   * if it stopped after that layer, most likely first. After the last layer it is the
   * prediction itself.
   */
  logitLens: Prediction[][];
  /** The top-10 next-token predictions made at this Position, most likely first. */
  predictions: Prediction[];
}

export interface Trace {
  header: TraceHeader;
  /** The first promptLength Positions are the Prompt; each later one is a Step of the Continuation. */
  promptLength: number;
  positions: PositionRecord[];
}

function fromBase64(encoded: string): Uint8Array {
  return Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
}

function float32s(encoded: string): number[] {
  const bytes = fromBase64(encoded);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Array.from({ length: bytes.byteLength / 4 }, (_, i) => view.getFloat32(i * 4, true));
}

function decodeEmbedding(wire: Wire.Embedding): Embedding {
  const bytes = fromBase64(wire.values);
  const int8s = new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    values: Float32Array.from(int8s, (value) => value * wire.scale),
    firstDimensions: float32s(wire.first_dimensions),
    norm: wire.norm,
  };
}

function decodeAttention(encoded: string, position: number, { n_layer, n_head }: Wire.ModelConfig): Float32Array[][] {
  const weights = Float32Array.from(fromBase64(encoded), (value) => value / ATTENTION_STEPS);
  const length = position + 1;
  return Array.from({ length: n_layer }, (_, layer) =>
    Array.from({ length: n_head }, (_, head) => {
      const start = (layer * n_head + head) * length;
      return weights.subarray(start, start + length);
    }),
  );
}

function decodeToken(wire: Wire.Token): Token {
  return { tokenId: wire.token_id, tokenText: wire.token_text, tokenBytes: fromBase64(wire.token_bytes) };
}

function decodePredictions(wire: Wire.TopTokens): Prediction[] {
  const probabilities = float32s(wire.probabilities);
  return wire.tokens.map((token, i) => ({ ...decodeToken(token), probability: probabilities[i]! }));
}

export function decodeTrace(wire: Wire.Trace): Trace {
  return {
    header: wire.header,
    promptLength: wire.prompt_length,
    positions: wire.positions.map((record, position) => ({
      ...decodeToken(record),
      tokenEmbedding: decodeEmbedding(record.token_embedding),
      positionEmbedding: decodeEmbedding(record.position_embedding),
      attention: decodeAttention(record.attention, position, wire.header.config),
      mlpImpact: float32s(record.mlp_impact),
      logitLens: record.logit_lens.map(decodePredictions),
      predictions: decodePredictions(record.predictions),
    })),
  };
}

/** How many Steps the Trace holds beyond its Prompt. */
export function stepCount(trace: Trace): number {
  return trace.positions.length - trace.promptLength;
}

/** The Trace as it stands at a Step: the Prompt plus the first `step` Continuation tokens. */
export function atStep(trace: Trace, step: number): Trace {
  return { ...trace, positions: trace.positions.slice(0, trace.promptLength + step) };
}

export async function loadExample(id: string): Promise<Trace> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/examples/${id}.json`);
  if (!response.ok) throw new Error(`Example "${id}" failed to load (HTTP ${response.status})`);
  return decodeTrace((await response.json()) as Wire.Trace);
}
