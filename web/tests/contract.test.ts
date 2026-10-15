// The committed contract schema, checked from the web app's side.
import { readdirSync, readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM script without type declarations
import { SCHEMA_PATH, TYPES_PATH, generateTraceTypes } from "../scripts/gen-types.mjs";

const EXAMPLES_DIR = new URL("../public/data/examples/", import.meta.url);
const exampleFiles = readdirSync(EXAMPLES_DIR).filter((name) => name.endsWith(".json"));
const validate = new Ajv2020({ allErrors: true }).compile(
  JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")),
);

describe("Example files", () => {
  it("exist", () => {
    expect(exampleFiles.length).toBeGreaterThan(0);
  });

  it.each(exampleFiles)("%s validates against the committed schema", (name) => {
    const example = JSON.parse(readFileSync(new URL(name, EXAMPLES_DIR), "utf-8"));
    expect(validate(example), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it("a Trace whose token bytes are not base64 is rejected", () => {
    const [first] = exampleFiles;
    const example = JSON.parse(readFileSync(new URL(first!, EXAMPLES_DIR), "utf-8"));
    example.positions[0].token_bytes = "not base64!";
    expect(validate(example)).toBe(false);
  });
});

describe("Generated TypeScript types", () => {
  it("match the committed schema", async () => {
    expect(readFileSync(TYPES_PATH, "utf-8"), "run `npm run gen:types`").toBe(
      await generateTraceTypes(),
    );
  });
});
