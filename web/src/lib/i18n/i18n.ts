// UI text in the current language. Reads the language from the route, so text
// rendered in a component updates when the language changes.
import { route } from "../app/route.svelte";
import type { Lang } from "../app/viewState";
import { interpolate, parseMessage, type MessagePart } from "./markup";
import { de } from "./messages/de";
import { en, type MessageKey } from "./messages/en";
import { tr } from "./messages/tr";

export type { MessageKey };

export const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, tr, de };

type Params = Record<string, string | number>;
type PluralKey = MessageKey extends infer K ? (K extends `${infer P}.other` ? P : never) : never;

/** A number format in the reader's language, for formatting many numbers alike. */
export function numberFormat(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  return new Intl.NumberFormat(route.lang, options);
}

export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return numberFormat(options).format(n);
}

/** A probability as a percentage with one decimal, in the reader's number format. */
export function formatPercent(p: number): string {
  return formatNumber(p, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function format(key: MessageKey, params: Params): string {
  const values = Object.fromEntries(
    Object.entries(params).map(([name, value]) => [name, typeof value === "number" ? formatNumber(value) : value]),
  );
  return interpolate(MESSAGES[route.lang][key], values);
}

/** The message as rich text: plain parts plus technical terms to explain. */
export function rich(key: MessageKey, params: Params = {}): MessagePart[] {
  return parseMessage(format(key, params));
}

/** The message as plain text, technical terms included as written. */
export function t(key: MessageKey, params: Params = {}): string {
  return rich(key, params)
    .map((part) => part.text)
    .join("");
}

export function tPlural(key: PluralKey, n: number): string {
  const form = new Intl.PluralRules(route.lang).select(n) === "one" ? "one" : "other";
  return t(`${key}.${form}`, { n });
}
