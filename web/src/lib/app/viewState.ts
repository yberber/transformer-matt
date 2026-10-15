// View state lives in the query string so a URL reopens the same view (ADR 0002).
// Unknown or missing values fall back to defaults; the language defaults to the
// browser's, with English as fallback.
import { DEFAULT_EXAMPLE, EXAMPLE_IDS, EXAMPLE_STEPS, type ExampleId } from "../trace/examples";

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
  example: ExampleId;
  view: View;
  /** Counted from 1, as the UI shows it. */
  layer: number;
  /** Counted from 1 within the layer, as the UI shows it. */
  head: number;
  /** 0 is the Prompt alone. */
  step: number;
  lang: Lang;
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

export function readViewState(search: string, languages: readonly string[]): ViewState {
  const params = new URLSearchParams(search);
  return {
    example: pick(EXAMPLE_IDS, params.get("example")) ?? DEFAULT_EXAMPLE,
    view: pick(VIEWS, params.get("view")) ?? "tokenize",
    layer: pickNumber(params.get("layer"), 1, LAYERS) ?? 1,
    head: pickNumber(params.get("head"), 1, HEADS) ?? 1,
    step: pickNumber(params.get("step"), 0, EXAMPLE_STEPS) ?? 0,
    lang: pick(LANGS, params.get("lang")) ?? browserLang(languages),
  };
}

export function viewStateQuery({ example, view, layer, head, step, lang }: ViewState): string {
  return new URLSearchParams({
    example,
    view,
    layer: String(layer),
    head: String(head),
    step: String(step),
    lang,
  }).toString();
}
