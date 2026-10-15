// UI text exists in English, Turkish and German, with English as the source.
import { describe, expect, it } from "vitest";
import { parameters, parseMessage, termMarkers, TERMS } from "../src/lib/i18n/markup";
import { de } from "../src/lib/i18n/messages/de";
import { en } from "../src/lib/i18n/messages/en";
import { tr } from "../src/lib/i18n/messages/tr";

const languages: Record<string, Record<string, string>> = { en, tr, de };
const keys = Object.keys(en).sort();

describe.each(Object.entries(languages))("%s", (_, messages) => {
  it("has every translation key, and no others", () => {
    expect(Object.keys(messages).sort()).toEqual(keys);
  });

  it.each(keys)("%s is not empty", (key) => {
    expect(messages[key]?.trim()).not.toBe("");
  });

  it.each(keys)("%s has the same parameters and technical terms as English", (key) => {
    const message = messages[key]!;
    expect(parameters(message)).toEqual(parameters(en[key as keyof typeof en]));
    expect(termMarkers(message)).toEqual(termMarkers(en[key as keyof typeof en]));
  });

  it("keeps technical terms in English", () => {
    for (const message of Object.values(messages)) {
      for (const part of parseMessage(message)) {
        if (part.kind === "term") expect(part.text.toLowerCase()).toMatch(new RegExp(`^${part.term}s?$`));
      }
    }
  });
});

it("every technical term has an explanation", () => {
  for (const term of TERMS) expect(keys).toContain(`term.${term}`);
});

it("marks only known technical terms", () => {
  const marked = Object.values(languages).flatMap((messages) => Object.values(messages).flatMap(termMarkers));
  expect(marked.length).toBeGreaterThan(0);
  for (const term of marked) expect(TERMS).toContain(term);
});
