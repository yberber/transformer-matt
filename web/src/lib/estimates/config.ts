// GPT-2 small's official config, as the regeneration script copies it from the pinned
// revision. Bundled rather than fetched: it is under a kilobyte, and every Estimate needs it.
import official from "../../../public/data/gpt2-config.json";

/** The config values the Estimates are derived from, named as in the official config. */
export interface ModelConfig {
  vocab_size: number;
  n_positions: number;
  n_embd: number;
  n_layer: number;
  n_head: number;
}

export const GPT2_CONFIG: ModelConfig = official;
