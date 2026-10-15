// Splits a token's raw bytes into the pieces the UI draws, so invisible
// characters and partial characters never disappear.

export type DisplayPart =
  | { kind: "text"; text: string }
  | { kind: "space" }
  | { kind: "newline" }
  | { kind: "tab" }
  | { kind: "bytes"; bytes: Uint8Array };

const strictUtf8 = new TextDecoder("utf-8", { fatal: true });

function sequenceLength(lead: number): number {
  if (lead < 0x80) return 1;
  if (lead >= 0xc2 && lead <= 0xdf) return 2;
  if (lead >= 0xe0 && lead <= 0xef) return 3;
  if (lead >= 0xf0 && lead <= 0xf4) return 4;
  return 0;
}

function decodeAt(bytes: Uint8Array, start: number): string | null {
  const length = sequenceLength(bytes[start]!);
  if (length === 0 || start + length > bytes.length) return null;
  try {
    return strictUtf8.decode(bytes.subarray(start, start + length));
  } catch {
    return null;
  }
}

function pushText(parts: DisplayPart[], text: string): void {
  const last = parts.at(-1);
  if (last?.kind === "text") last.text += text;
  else parts.push({ kind: "text", text });
}

function pushByte(parts: DisplayPart[], byte: number): void {
  const last = parts.at(-1);
  if (last?.kind === "bytes") last.bytes = Uint8Array.of(...last.bytes, byte);
  else parts.push({ kind: "bytes", bytes: Uint8Array.of(byte) });
}

export function displayParts(bytes: Uint8Array): DisplayPart[] {
  const parts: DisplayPart[] = [];
  let i = 0;
  while (i < bytes.length) {
    const char = decodeAt(bytes, i);
    if (char === null) {
      pushByte(parts, bytes[i]!);
      i += 1;
      continue;
    }
    if (char === " ") parts.push({ kind: "space" });
    else if (char === "\n") parts.push({ kind: "newline" });
    else if (char === "\t") parts.push({ kind: "tab" });
    else pushText(parts, char);
    i += sequenceLength(bytes[i]!);
  }
  return parts;
}

export function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}
