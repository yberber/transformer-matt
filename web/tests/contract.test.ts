// The committed contract schema, checked from the web app's side.
import { readdirSync, readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { EXAMPLE_IDS } from "../src/lib/trace/examples";
import {
  API_SCHEMA_PATH,
  API_TYPES_PATH,
  SCHEMA_PATH,
  TYPES_PATH,
  generateApiTypes,
  generateTraceTypes,
  // @ts-expect-error: plain ESM script without type declarations
} from "../scripts/gen-types.mjs";

const EXAMPLES_DIR = new URL("../public/data/examples/", import.meta.url);
const exampleFiles = readdirSync(EXAMPLES_DIR).filter((name) => name.endsWith(".json"));
const validate = new Ajv2020({ allErrors: true }).compile(
  JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")),
);

describe("Example files", () => {
  it("are exactly the Examples the web app lists", () => {
    expect(exampleFiles.map((name) => name.replace(/\.json$/, "")).sort()).toEqual([...EXAMPLE_IDS].sort());
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

// Live-API fixtures: real inference-server responses, recorded by `npm run record:fixtures`.
// Each is listed with the API model it must validate as.
const FIXTURES_DIR = new URL("fixtures/live/", import.meta.url);
const LIVE_FIXTURES = [
  ["health-ready", "Health"],
  ["health-loading", "Health"],
  ["tokenize", "TokenizeResponse"],
  ["tokenize-over-limit", "TokenizeResponse"],
  ["step-prompt", "StepResponse"],
  ["step-token-ids", "StepResponse"],
  ["error-prompt-too-long", "Error"],
  ["error-continuation-too-long", "Error"],
  ["error-model-loading", "Error"],
  ["error-rate-limited", "Error"],
] as const;
const api = new Ajv2020({ allErrors: true }).addSchema(JSON.parse(readFileSync(API_SCHEMA_PATH, "utf-8")), "api");
const readFixture = (name: string) => JSON.parse(readFileSync(new URL(`${name}.json`, FIXTURES_DIR), "utf-8"));

describe("Live-API fixtures", () => {
  it("are exactly the fixtures listed here", () => {
    const files = readdirSync(FIXTURES_DIR).filter((name) => name.endsWith(".json"));
    expect(files.sort()).toEqual(LIVE_FIXTURES.map(([name]) => `${name}.json`).sort());
  });

  it.each(LIVE_FIXTURES)("%s validates against the committed API schema as %s", (name, model) => {
    expect(api.validate(`api#/$defs/${model}`, readFixture(name)), JSON.stringify(api.errors, null, 2)).toBe(true);
  });

  it("a Step response without its first Position is rejected", () => {
    const { first_position: _, ...response } = readFixture("step-token-ids");
    expect(api.validate("api#/$defs/StepResponse", response)).toBe(false);
  });
});

describe("Generated TypeScript types", () => {
  it("match the committed Trace schema", async () => {
    expect(readFileSync(TYPES_PATH, "utf-8"), "run `npm run gen:types`").toBe(
      await generateTraceTypes(),
    );
  });

  it("match the committed API schema", async () => {
    expect(readFileSync(API_TYPES_PATH, "utf-8"), "run `npm run gen:types`").toBe(await generateApiTypes());
  });
});
