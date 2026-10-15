// The built-in Examples. Each one has an Example file under public/data/examples/,
// written by the regeneration script (python/src/regenerate), which also lists them.
export const BANDS = ["short", "medium", "long"] as const;
export type Band = (typeof BANDS)[number];

export const EXAMPLES = [
  { id: "baker", band: "short", title: "The early baker" },
  { id: "village", band: "short", title: "Once upon a time" },
  { id: "buttons", band: "medium", title: "Grandmother's buttons" },
  { id: "einstein", band: "medium", title: "Albert Einstein" },
  { id: "stray-dog", band: "long", title: "The stray dog" },
  { id: "moon", band: "long", title: "The drifting Moon" },
] as const satisfies readonly { id: string; band: Band; title: string }[];

export type ExampleId = (typeof EXAMPLES)[number]["id"];
export const EXAMPLE_IDS: readonly ExampleId[] = EXAMPLES.map((example) => example.id);
export const DEFAULT_EXAMPLE: ExampleId = "village";

/** Every Example ships with this many precomputed Steps. */
export const EXAMPLE_STEPS = 16;
