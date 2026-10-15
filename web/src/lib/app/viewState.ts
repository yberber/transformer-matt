// View state lives in the query string so a URL reopens the same view (ADR 0002).
// Unknown or missing values fall back to defaults; the language defaults to the
// browser's, with English as fallback.
import { DEFAULT_EXAMPLE, EXAMPLE_IDS, EXAMPLE_STEPS, type ExampleId } from "../trace/examples";

export const VIEWS = ["tokenize", "embed", "blocks", "predict"] as const;
export type View = (typeof VIEWS)[number];

export const LANGS = ["en", "tr", "de"] as const;
export type Lang = (typeof LANGS)[number];

export interface ViewState {
  example: ExampleId;
  view: View;
  /** 0 is the Prompt alone. */
  step: number;
  lang: Lang;
}

function pick<T extends string>(options: readonly T[], value: string | null | undefined): T | undefined {
  return options.find((option) => option === value);
}

function pickStep(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const step = Number(value);
  return step <= EXAMPLE_STEPS ? step : undefined;
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
    step: pickStep(params.get("step")) ?? 0,
    lang: pick(LANGS, params.get("lang")) ?? browserLang(languages),
  };
}

export function viewStateQuery({ example, view, step, lang }: ViewState): string {
  return new URLSearchParams({ example, view, step: String(step), lang }).toString();
}
