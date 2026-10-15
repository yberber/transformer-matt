// Records the Live-API fixtures under tests/fixtures/live/ from the real inference
// server, which this script starts (`uv run serve` in ../python) on a spare port.
// The loading-state responses are recorded first, while the model is still loading,
// and the rate-limited one last.
// Run with `npm run record:fixtures`; `npm test` validates them against the schema.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const PORT = 8765;
const API = `http://127.0.0.1:${PORT}`;
const FIXTURES_DIR = fileURLToPath(new URL("../tests/fixtures/live/", import.meta.url));
const PYTHON_DIR = fileURLToPath(new URL("../../python/", import.meta.url));

const PROMPT = "The lighthouse keeper climbed the stairs";
// Well over the 64-token limit, so the count goes past it.
const LONG_PROMPT = Array.from({ length: 12 }, () => "The tide came in and the boats rose.").join(" ");

async function call(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body && JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

async function record(name, { status, json }, expectedStatus) {
  if (status !== expectedStatus) throw new Error(`${name}: HTTP ${status}, expected ${expectedStatus}`);
  await writeFile(`${FIXTURES_DIR}${name}.json`, JSON.stringify(json, null, 2) + "\n");
  console.log(`Recorded ${name}`);
  return json;
}

async function untilListening() {
  for (;;) {
    try {
      return await call("/health");
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function untilReady() {
  while ((await call("/health")).status !== 200) await new Promise((resolve) => setTimeout(resolve, 500));
}

const server = spawn("uv", ["run", "serve"], { cwd: PYTHON_DIR, env: { ...process.env, PORT: String(PORT) }, stdio: "inherit" });
try {
  await mkdir(FIXTURES_DIR, { recursive: true });
  await record("health-loading", await untilListening(), 503);
  await record("error-model-loading", await call("/tokenize", { prompt: PROMPT }), 503);
  await untilReady();
  await record("health-ready", await call("/health"), 200);
  await record("tokenize", await call("/tokenize", { prompt: PROMPT }), 200);
  await record("tokenize-over-limit", await call("/tokenize", { prompt: LONG_PROMPT }), 200);
  const run = await record("step-prompt", await call("/step", { prompt: PROMPT, advance: 1 }), 200);
  const tokenIds = run.positions.map((position) => position.token_id);
  const step = { token_ids: tokenIds, prompt_length: run.prompt_length };
  await record("step-token-ids", await call("/step", { ...step, advance: 1 }), 200);
  await record("error-prompt-too-long", await call("/step", { prompt: LONG_PROMPT, advance: 0 }), 422);
  await record("error-continuation-too-long", await call("/step", { ...step, advance: 64 }), 422);
  // Last, as it uses up the tokenize rate limit (120 calls a minute).
  let limited = await call("/tokenize", { prompt: PROMPT });
  for (let calls = 1; calls <= 120 && limited.status === 200; calls++) limited = await call("/tokenize", { prompt: PROMPT });
  await record("error-rate-limited", limited, 429);
} finally {
  server.kill();
}
