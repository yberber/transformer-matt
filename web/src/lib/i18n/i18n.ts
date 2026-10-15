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

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(route.lang).format(n);
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
