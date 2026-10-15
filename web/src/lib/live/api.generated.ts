// Generated from contract/api.schema.json by `npm run gen:types`. Do not edit.

export type ApiModel =
  | Embedding
  | Error
  | Health
  | ModelConfig
  | PositionRecord
  | PromptStepRequest
  | StepResponse
  | Token
  | TokenStepRequest
  | TokenizeRequest
  | TokenizeResponse
  | TopTokens
  | TraceHeader;

/**
 * An n_embd-dimension embedding vector: all of it as int8 for drawing, its
 * first dimensions exactly, and its norm.
 */
export interface Embedding {
  values: string;
  scale: number;
  first_dimensions: string;
  norm: number;
}
/**
 * Every non-2xx response except Health's 503. `message` is for developers; the
 * web app words its own message from `code`.
 */
export interface Error {
  code:
    | "prompt_too_long"
    | "continuation_too_long"
    | "empty_prompt"
    | "invalid_request"
    | "model_loading"
    | "rate_limited"
    | "not_found"
    | "method_not_allowed";
  message: string;
}
/**
 * Whether the server can run the model: "loading" (503) until the model is
 * loaded, then "ready" (200).
 */
export interface Health {
  status: "loading" | "ready";
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
  token_embedding: Embedding;
  position_embedding: Embedding;
  attention: string;
  mlp_impact: string;
  logit_lens: TopTokens[];
  predictions: TopTokens;
}
/**
 * The most likely next tokens, most likely first, with their probabilities in the same order.
 */
export interface TopTokens {
  tokens: Token[];
  probabilities: string;
}
/**
 * A token of the vocabulary: its ID, its text and its raw bytes.
 */
export interface Token {
  token_id: number;
  token_text: string;
  token_bytes: string;
}
/**
 * Run the Prompt text and take `advance` Steps; the response starts at Position 0.
 */
export interface PromptStepRequest {
  /**
   * Prompt text.
   */
  prompt: string;
  advance: number;
}
/**
 * The records of the Positions a Step request added, in a Trace's shape (ADR 0001):
 * a Trace's Positions from `first_position` on. Appending them to the Positions
 * before it gives the Trace; with `first_position` 0 the response is a whole Trace.
 */
export interface StepResponse {
  header: TraceHeader;
  prompt_length: number;
  first_position: number;
  positions: PositionRecord[];
}
export interface TraceHeader {
  model_id: string;
  model_revision: string;
  config: ModelConfig;
}
/**
 * Continue a sequence: the token IDs so far (Prompt then Continuation), of which
 * the first `prompt_length` are the Prompt. The response holds only the `advance`
 * new Positions. Continuation text is never re-tokenized, so the IDs travel as they are.
 */
export interface TokenStepRequest {
  token_ids: number[];
  prompt_length: number;
  advance: number;
}
export interface TokenizeRequest {
  /**
   * Prompt text.
   */
  prompt: string;
}
/**
 * The Prompt's tokens in order, and how many there are (which may exceed the limit).
 */
export interface TokenizeResponse {
  tokens: Token[];
  count: number;
}
