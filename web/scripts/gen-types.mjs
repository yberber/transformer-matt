// Generates TypeScript types from the committed contract schemas: the Trace's, and
// the inference server's requests and responses. Run with `npm run gen:types` after
// `uv run export-schema`.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

export const SCHEMA_PATH = fileURLToPath(new URL("../../contract/trace.schema.json", import.meta.url));
export const TYPES_PATH = fileURLToPath(new URL("../src/lib/trace/trace.generated.ts", import.meta.url));
export const API_SCHEMA_PATH = fileURLToPath(new URL("../../contract/api.schema.json", import.meta.url));
export const API_TYPES_PATH = fileURLToPath(new URL("../src/lib/live/api.generated.ts", import.meta.url));

// Pydantic titles every property; without this each one becomes a type alias.
function dropPropertyTitles(schema) {
  for (const definition of [schema, ...Object.values(schema.$defs ?? {})]) {
    for (const property of Object.values(definition.properties ?? {})) delete property.title;
  }
  return schema;
}

async function readSchema(path) {
  return dropPropertyTitles(JSON.parse(await readFile(path, "utf-8")));
}

export async function generateTraceTypes() {
  return compile(await readSchema(SCHEMA_PATH), "Trace", {
    additionalProperties: false,
    bannerComment:
      "// Generated from contract/trace.schema.json by `npm run gen:types`. Do not edit.",
  });
}

// The API schema has no root model, only every request and response under `$defs`.
export async function generateApiTypes() {
  const { $defs, $schema } = await readSchema(API_SCHEMA_PATH);
  const anyModel = { $schema, title: "ApiModel", anyOf: Object.keys($defs).map((name) => ({ $ref: `#/$defs/${name}` })), $defs };
  return compile(anyModel, "ApiModel", {
    additionalProperties: false,
    bannerComment: "// Generated from contract/api.schema.json by `npm run gen:types`. Do not edit.",
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeFile(TYPES_PATH, await generateTraceTypes());
  await writeFile(API_TYPES_PATH, await generateApiTypes());
  console.log(`Wrote ${TYPES_PATH} and ${API_TYPES_PATH}`);
}
