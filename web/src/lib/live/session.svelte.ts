// Live mode's state: whether the inference server can run the model, the user's
// Prompt with its token preview, and the Trace of the run so far. The Trace is held
// in the browser only; editing the Prompt discards it. A shared Live link restores its
// Prompt and every Step up to the shared one in a single Step request.
import { appendStep, decodeStepTrace, decodeToken, type Token, type Trace } from "../trace/decode";
import * as api from "./api";
import { LiveApiError, MAX_PROMPT_TOKENS, type LiveErrorCode } from "./api";

/**
 * "off" outside Live mode. On activation, "checking" the server; "warming up" while it
 * loads the model (Health answers 503); then "ready", or "unavailable" if the server does
 * not answer, fails, or is still loading after the warm-up limit.
 */
export type ServerStatus = "off" | "checking" | "warming" | "ready" | "unavailable";

/** Each Health call waits at most this long. */
const HEALTH_TIMEOUT_MS = 3_000;
/** While the model loads, Health is retried after 1 s, 2 s, 4 s, … up to this long in all, with a last check at the end. */
const WARM_UP_LIMIT_MS = 60_000;
const FIRST_RETRY_MS = 1_000;
const MAX_RETRY_MS = 8_000;
/** Typing is tokenized once it pauses for this long. */
const TOKENIZE_DEBOUNCE_MS = 300;
/** When rate limited without being told for how long, the wait before retrying. */
const DEFAULT_WAIT_S = 1;

/** How long a rate-limited call must wait before it is made again. */
function waitMs(error: LiveApiError): number {
  return (error.retryAfter ?? DEFAULT_WAIT_S) * 1000;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), reject(signal.reason)), { once: true });
  });
}

class LiveSession {
  status = $state<ServerStatus>("off");
  prompt = $state("");
  /** The Prompt's tokens as the server split them; absent until tokenized. */
  preview = $state.raw<{ tokens: Token[]; count: number }>();
  /** Whether the Prompt is over the token limit, so it cannot be run. */
  tooLong = $state(false);
  /** The run so far: the Prompt and every Step taken; absent until the Prompt is run. */
  trace = $state.raw<Trace>();
  /** Whether a Step request is on its way. */
  busy = $state(false);
  /** Why the last call failed, other than the server being unavailable. */
  error = $state<LiveErrorCode>();
  /** While rate limited: how many seconds the server asked to wait, if it said. */
  retryAfter = $state<number>();
  /** From opening a shared Live link until it is restored: the Step it was shared at. */
  sharedStep = $state<number>();

  #health?: AbortController;
  #tokenize?: AbortController;
  #tokenizeTimer?: ReturnType<typeof setTimeout>;
  #step?: AbortController;
  #waitTimer?: ReturnType<typeof setTimeout>;

  /** Enters Live mode: checks the server unless it is known to be ready. */
  activate(): void {
    if (this.status === "off" || this.status === "unavailable") void this.#checkHealth();
  }

  /** Opens a shared Live link: its Prompt is run up to its Step once the server is ready. */
  restore(prompt: string, step: number): void {
    this.setPrompt(prompt);
    this.sharedStep = step;
    if (this.status === "ready") void this.run();
  }

  /** Leaves Live mode. The Prompt and its Trace stay for a return to Live mode; a restore not yet done is dropped. */
  deactivate(): void {
    this.sharedStep = undefined;
    this.#health?.abort();
    this.#tokenize?.abort();
    this.#step?.abort();
    clearTimeout(this.#tokenizeTimer);
    clearTimeout(this.#waitTimer);
    this.busy = false;
    this.status = "off";
  }

  retry(): void {
    void this.#checkHealth();
  }

  /** The user edited the Prompt: the Trace no longer matches it, so it is discarded. */
  setPrompt(prompt: string): void {
    this.prompt = prompt;
    this.trace = undefined;
    this.error = undefined;
    this.sharedStep = undefined;
    this.#step?.abort();
    this.busy = false;
    this.#scheduleTokenize();
  }

  /**
   * Runs the Prompt alone (Step 0), or, restoring a shared Live link, up to its Step in one
   * request. Resolves whether it succeeded.
   */
  async run(): Promise<boolean> {
    const advance = this.sharedStep ?? 0;
    const done = await this.#request({ prompt: this.prompt, advance }, (response) => decodeStepTrace(response));
    if (done) this.sharedStep = undefined;
    return done;
  }

  /** Takes one more Step from the token IDs so far. Resolves whether it succeeded. */
  advance(): Promise<boolean> {
    const trace = this.trace;
    if (!trace) return Promise.resolve(false);
    const request = {
      token_ids: trace.positions.map((position) => position.tokenId),
      prompt_length: trace.promptLength,
      advance: 1,
    };
    return this.#request(request, (response) => appendStep(trace, response));
  }

  async #request(
    request: Parameters<typeof api.step>[0],
    toTrace: (response: Awaited<ReturnType<typeof api.step>>) => Trace,
  ): Promise<boolean> {
    this.#step?.abort();
    const controller = (this.#step = new AbortController());
    this.busy = true;
    this.error = undefined;
    try {
      this.trace = toTrace(await api.step(request, controller.signal));
      return true;
    } catch (error) {
      if (!controller.signal.aborted) this.#fail(error);
      return false;
    } finally {
      if (this.#step === controller) this.busy = false;
    }
  }

  #fail(error: unknown): void {
    if (!(error instanceof LiveApiError)) throw error;
    if (error.code === "unavailable") this.status = "unavailable";
    else if (error.code === "model_loading") void this.#checkHealth();
    else if (error.code === "rate_limited") this.#showWait(error);
    else this.error = error.code;
  }

  /** Rate limited: says how long to wait, until the wait is over. */
  #showWait(error: LiveApiError): void {
    this.error = "rate_limited";
    this.retryAfter = error.retryAfter;
    clearTimeout(this.#waitTimer);
    this.#waitTimer = setTimeout(() => {
      if (this.error === "rate_limited") this.error = undefined;
      this.retryAfter = undefined;
    }, waitMs(error));
  }

  async #checkHealth(): Promise<void> {
    this.#health?.abort();
    const controller = (this.#health = new AbortController());
    this.status = "checking";
    const started = Date.now();
    let wait = FIRST_RETRY_MS;
    try {
      while ((await api.health(AbortSignal.any([controller.signal, AbortSignal.timeout(HEALTH_TIMEOUT_MS)]))) === "loading") {
        this.status = "warming";
        const left = WARM_UP_LIMIT_MS - (Date.now() - started);
        if (left <= 0) throw new LiveApiError("unavailable");
        await sleep(Math.min(wait, left), controller.signal);
        wait = Math.min(wait * 2, MAX_RETRY_MS);
      }
      this.status = "ready";
      this.#scheduleTokenize(0);
      if (this.sharedStep !== undefined) void this.run();
    } catch (error) {
      if (!controller.signal.aborted) this.#fail(error);
    }
  }

  #scheduleTokenize(delay = TOKENIZE_DEBOUNCE_MS): void {
    clearTimeout(this.#tokenizeTimer);
    this.#tokenize?.abort();
    if (!this.prompt) {
      this.preview = undefined;
      this.tooLong = false;
      return;
    }
    this.#tokenizeTimer = setTimeout(() => void this.#tokenizePrompt(), delay);
  }

  async #tokenizePrompt(): Promise<void> {
    if (this.status !== "ready") return; // Tokenized once the server is ready.
    const controller = (this.#tokenize = new AbortController());
    try {
      const { tokens, count } = await api.tokenize(this.prompt, controller.signal);
      this.preview = { tokens: tokens.map(decodeToken), count };
      this.tooLong = count > MAX_PROMPT_TOKENS;
    } catch (error) {
      if (controller.signal.aborted) return;
      // Text so long that the server refuses to tokenize it is over the limit too.
      if (error instanceof LiveApiError && error.code === "prompt_too_long") {
        this.preview = undefined;
        this.tooLong = true;
      } else {
        this.#fail(error);
        // The preview is tokenized again once the wait is over.
        if (error instanceof LiveApiError && error.code === "rate_limited") this.#scheduleTokenize(waitMs(error));
      }
    }
  }
}

export const live = new LiveSession();
