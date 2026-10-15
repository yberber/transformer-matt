// View state lives in the query string so a URL reopens the same view. A Live-mode
// Prompt lives in the fragment instead, which browsers never send to the server
// (ADR 0002). Unknown or missing values fall back to defaults; the language defaults
// to the browser's, with English as fallback.
import { MAX_CONTINUATION_TOKENS } from "../live/api";
import { DEFAULT_EXAMPLE, EXAMPLE_IDS, EXAMPLE_STEPS, type ExampleId } from "../trace/examples";

/** Example mode by default; Live mode runs the user's own Prompt on the inference server. */
export const MODES = ["example", "live"] as const;
export type Mode = (typeof MODES)[number];

/** The last Step a run can reach: an Example's precomputed Steps, or Live mode's limit. */
export function stepLimit(mode: Mode): number {
  return mode === "live" ? MAX_CONTINUATION_TOKENS : EXAMPLE_STEPS;
}

/** The pipeline's stages, in order: the stations of the pipeline strip. */
export const STAGES = ["tokenize", "embed", "blocks", "predict"] as const;
export type Stage = (typeof STAGES)[number];

/** The separate pages about the whole model, outside the pipeline and the same at every Step. */
export const PAGES = ["architecture", "statistics", "calculate"] as const;
export type Page = (typeof PAGES)[number];

/** Every view: the stages; attention, which opens up one layer and head of Blocks; and the pages. */
export const VIEWS = [...STAGES, "attention", ...PAGES] as const;
export type View = (typeof VIEWS)[number];

export function isPage(view: View): view is Page {
  return PAGES.some((page) => page === view);
}

/** The pipeline stage a view belongs to; a page belongs to none. */
export function stageOf(view: View): Stage | undefined {
  if (isPage(view)) return undefined;
  return view === "attention" ? "blocks" : view;
}

/** GPT-2 small's n_layer and n_head, as every Trace header gives them. */
export const LAYERS = 12;
export const HEADS = 12;

export const LANGS = ["en", "tr", "de"] as const;
export type Lang = (typeof LANGS)[number];

export interface ViewState {
  mode: Mode;
  /** In Live mode, the Example to return to. */
  example: ExampleId;
  view: View;
  /** Counted from 1, as the UI shows it. */
  layer: number;
  /** Counted from 1 within the layer, as the UI shows it. */
  head: number;
  /** 0 is the Prompt alone. */
  step: number;
  lang: Lang;
  /** In Live mode, the user's Prompt; it travels in the URL fragment, never the query string. */
  prompt: string;
}

function pick<T extends string>(options: readonly T[], value: string | null | undefined): T | undefined {
  return options.find((option) => option === value);
}

function pickNumber(value: string | null, min: number, max: number): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n >= min && n <= max ? n : undefined;
}

function browserLang(languages: readonly string[]): Lang {
  for (const tag of languages) {
    const lang = pick(LANGS, tag.split("-")[0]?.toLowerCase());
    if (lang) return lang;
  }
  return "en";
}

export function readViewState(search: string, hash: string, languages: readonly string[]): ViewState {
  const params = new URLSearchParams(search);
  const mode = pick(MODES, params.get("mode")) ?? "example";
  return {
    mode,
    example: pick(EXAMPLE_IDS, params.get("example")) ?? DEFAULT_EXAMPLE,
    view: pick(VIEWS, params.get("view")) ?? "tokenize",
    layer: pickNumber(params.get("layer"), 1, LAYERS) ?? 1,
    head: pickNumber(params.get("head"), 1, HEADS) ?? 1,
    step: pickNumber(params.get("step"), 0, stepLimit(mode)) ?? 0,
    lang: pick(LANGS, params.get("lang")) ?? browserLang(languages),
    prompt: new URLSearchParams(hash.replace(/^#/, "")).get("prompt") ?? "",
  };
}

/** The query string: every part of the view state but the Prompt. */
export function viewStateQuery({ mode, example, view, layer, head, step, lang }: ViewState): string {
  return new URLSearchParams({
    mode,
    example,
    view,
    layer: String(layer),
    head: String(head),
    step: String(step),
    lang,
  }).toString();
}

/** The fragment: the Prompt in Live mode, and nothing otherwise. */
export function viewStateFragment({ mode, prompt }: ViewState): string {
  return mode === "live" && prompt ? new URLSearchParams({ prompt }).toString() : "";
}
