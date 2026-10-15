// The inference server's API, which the web app reaches under /api (the reverse proxy
// in production, the Vite server's proxy in development). Only Live mode calls it.
import type * as Api from "./api.generated";

/** Live mode runs a Prompt of at most this many tokens … */
export const MAX_PROMPT_TOKENS = 64;
/** … for at most this many Steps. */
export const MAX_CONTINUATION_TOKENS = 64;

/** Why a call failed: the server's error code, or "unavailable" when no server answered as one. */
export type LiveErrorCode = Api.Error["code"] | "unavailable";

export class LiveApiError extends Error {
  /** For "rate_limited": how many seconds to wait before continuing, if the server said. */
  constructor(
    readonly code: LiveErrorCode,
    readonly retryAfter?: number,
  ) {
    super(`Live API: ${code}`);
  }
}

const API_BASE = `${import.meta.env.BASE_URL}api`;

function isApiError(body: unknown): body is Api.Error {
  return typeof body === "object" && body !== null && typeof (body as Api.Error).code === "string";
}

/** Retry-After in whole seconds, as the server sends it; absent otherwise. */
function retryAfter(headers: Headers): number | undefined {
  const value = headers.get("Retry-After")?.trim();
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}

/** The call's JSON response, with its HTTP status and headers. */
async function call(
  path: string,
  signal: AbortSignal,
  body?: unknown,
): Promise<{ status: number; json: unknown; headers: Headers }> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    const json: unknown = await response.json().catch(() => undefined);
    // json() swallows an abort while reading the body, so check for one here.
    signal.throwIfAborted();
    return { status: response.status, json, headers: response.headers };
  } catch (error) {
    // A cancelled call stays cancelled; a timeout or a network failure means no server.
    if (signal.reason instanceof DOMException && signal.reason.name === "AbortError") throw error;
    throw new LiveApiError("unavailable");
  }
}

async function post<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
  const { status, json, headers } = await call(path, signal, body);
  if (status === 200) return json as T;
  // A proxy with no server behind it answers too (502), but not with the API's error shape.
  throw new LiveApiError(isApiError(json) ? json.code : "unavailable", retryAfter(headers));
}

/** "ready", or "loading" while the model loads (503); anything else means unavailable. */
export async function health(signal: AbortSignal): Promise<Api.Health["status"]> {
  const { status, json } = await call("/health", signal);
  const reported = (json as Partial<Api.Health> | undefined)?.status;
  if (status === 200 && reported === "ready") return "ready";
  if (status === 503 && reported === "loading") return "loading";
  throw new LiveApiError("unavailable");
}

export function tokenize(prompt: string, signal: AbortSignal): Promise<Api.TokenizeResponse> {
  return post("/tokenize", { prompt } satisfies Api.TokenizeRequest, signal);
}

export function step(
  request: Api.PromptStepRequest | Api.TokenStepRequest,
  signal: AbortSignal,
): Promise<Api.StepResponse> {
  return post("/step", request, signal);
}
