// The one Trace decoder: Example files and Live API responses share this path (ADR 0001).
import type * as Wire from "./trace.generated";

export type TraceHeader = Wire.TraceHeader;

export interface PositionRecord {
  tokenId: number;
  tokenText: string;
  tokenBytes: Uint8Array;
}

export interface Trace {
  header: TraceHeader;
  positions: PositionRecord[];
}

function fromBase64(encoded: string): Uint8Array {
  return Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
}

export function decodeTrace(wire: Wire.Trace): Trace {
  return {
    header: wire.header,
    positions: wire.positions.map((record) => ({
      tokenId: record.token_id,
      tokenText: record.token_text,
      tokenBytes: fromBase64(record.token_bytes),
    })),
  };
}

export async function loadExample(id: string): Promise<Trace> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/examples/${id}.json`);
  if (!response.ok) throw new Error(`Example "${id}" failed to load (HTTP ${response.status})`);
  return decodeTrace((await response.json()) as Wire.Trace);
}
