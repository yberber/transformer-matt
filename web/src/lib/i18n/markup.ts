// The small markup inside messages: {name} parameters and [[term|text]] technical terms.

export const TERMS = ["token", "embedding", "attention", "layer"] as const;
export type Term = (typeof TERMS)[number];

export type MessagePart = { kind: "text"; text: string } | { kind: "term"; term: Term; text: string };

const PARAMETER = /\{(\w+)\}/g;
const TERM = /\[\[(\w+)\|([^\]]+)\]\]/g;

export function parameters(message: string): string[] {
  return [...message.matchAll(PARAMETER)].map((match) => match[1]!).sort();
}

export function termMarkers(message: string): string[] {
  return [...message.matchAll(TERM)].map((match) => match[1]!).sort();
}

export function interpolate(message: string, values: Record<string, string>): string {
  return message.replace(PARAMETER, (match, name: string) => values[name] ?? match);
}

export function parseMessage(message: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let end = 0;
  for (const match of message.matchAll(TERM)) {
    if (match.index > end) parts.push({ kind: "text", text: message.slice(end, match.index) });
    const [whole, term, text] = match as unknown as [string, string, string];
    const known = TERMS.find((t) => t === term);
    parts.push(known ? { kind: "term", term: known, text } : { kind: "text", text });
    end = match.index + whole.length;
  }
  if (end < message.length) parts.push({ kind: "text", text: message.slice(end) });
  return parts;
}
