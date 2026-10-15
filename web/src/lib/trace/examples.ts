// The built-in Examples, by ID. Each one has an Example file under public/data/examples/.
export const EXAMPLE_IDS = ["placeholder"] as const;
export type ExampleId = (typeof EXAMPLE_IDS)[number];
export const DEFAULT_EXAMPLE: ExampleId = "placeholder";
