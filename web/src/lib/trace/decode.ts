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

export interface PositionRecord extends Token {
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
    positions: wire.positions.map((record) => ({
      ...decodeToken(record),
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
