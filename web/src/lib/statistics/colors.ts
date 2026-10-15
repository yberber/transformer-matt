// Each block component's color in the cost charts: five hues of the token palette (styles.css),
// in an order the dataviz skill's validate_palette.js passes as adjacent stacked segments.
//   light on #fbf8f1: CVD worst 9.1, normal-vision worst 24.4, all >= 3:1.
//   dark on #171d1a: CVD worst 9.0, normal-vision worst 25.2, all >= 3:1; above the lightness
//     band on purpose, like the token palette.
// The charts never show tokens, and every segment is also named in a legend and a table.
import type { BlockComponent } from "../estimates/flops";

export const COMPONENT_COLOR: Record<BlockComponent, string> = {
  qkv: "var(--token-0)",
  scores: "var(--token-1)",
  weightedSum: "var(--token-2)",
  outputProjection: "var(--token-6)",
  mlp: "var(--token-5)",
};
