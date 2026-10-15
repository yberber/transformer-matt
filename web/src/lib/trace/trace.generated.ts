// Generated from contract/trace.schema.json by `npm run gen:types`. Do not edit.

/**
 * Every recorded value for a Prompt and its Steps.
 */
export interface Trace {
  header: TraceHeader;
  positions: PositionRecord[];
}
export interface TraceHeader {
  model_id: string;
  model_revision: string;
  config: ModelConfig;
}
/**
 * The model config values the Trace was built with.
 */
export interface ModelConfig {
  vocab_size: number;
  n_positions: number;
  n_embd: number;
  n_layer: number;
  n_head: number;
}
/**
 * Everything recorded for one Position.
 */
export interface PositionRecord {
  token_id: number;
  token_text: string;
  token_bytes: string;
}
