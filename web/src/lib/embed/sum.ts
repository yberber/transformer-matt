// What enters the first block: a Position's token embedding plus its position embedding.
import type { Embedding } from "../trace/decode";

export interface EmbeddingSum {
  /** Every dimension, as close as the int8 strips it is added from. */
  values: Float32Array;
  /** The first dimensions, exactly: two float32s add exactly in a double, and fround rounds the way float32 addition does. */
  firstDimensions: number[];
}

export function addEmbeddings(a: Embedding, b: Embedding): EmbeddingSum {
  return {
    values: a.values.map((value, i) => value + b.values[i]!),
    firstDimensions: a.firstDimensions.map((value, i) => Math.fround(value + b.firstDimensions[i]!)),
  };
}
