// The KV cache's size: what decoding keeps so that earlier Positions need not be run again.
// Every layer keeps each Position's key and value, n_embd numbers each, as float32.
import type { ModelConfig } from "./config";

/** Bytes per number: the cache is assumed to hold float32. */
const FLOAT32_BYTES = 4;

export interface KvCache {
  /** One layer's keys, in bytes. */
  keys: number;
  /** One layer's values, in bytes. */
  values: number;
  /** One layer's keys and values, in bytes. */
  perLayer: number;
  layers: number;
  total: number;
}

/** The KV cache holding `positions` Positions. */
export function kvCacheBytes(config: ModelConfig, positions: number): KvCache {
  const { n_embd: width, n_layer: layers } = config;
  const keys = positions * width * FLOAT32_BYTES;
  const perLayer = 2 * keys;
  return { keys, values: keys, perLayer, layers, total: layers * perLayer };
}
