// Generates the Trace's TypeScript types from the committed contract schema.
// Run with `npm run gen:types` after `uv run export-schema`.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

export const SCHEMA_PATH = fileURLToPath(new URL("../../contract/trace.schema.json", import.meta.url));
export const TYPES_PATH = fileURLToPath(new URL("../src/lib/trace/trace.generated.ts", import.meta.url));

// Pydantic titles every property; without this each one becomes a type alias.
function dropPropertyTitles(schema) {
  for (const definition of [schema, ...Object.values(schema.$defs ?? {})]) {
    for (const property of Object.values(definition.properties ?? {})) delete property.title;
  }
  return schema;
}

export async function generateTraceTypes() {
  const schema = dropPropertyTitles(JSON.parse(await readFile(SCHEMA_PATH, "utf-8")));
  return compile(schema, "Trace", {
    additionalProperties: false,
    bannerComment:
      "// Generated from contract/trace.schema.json by `npm run gen:types`. Do not edit.",
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeFile(TYPES_PATH, await generateTraceTypes());
  console.log(`Wrote ${TYPES_PATH}`);
}
