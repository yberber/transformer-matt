// How the statistics write Estimates, in the reader's language: rounded to 3 significant
// digits in words ("247 million FLOPs", "1.25 MB") where they are read, exact in the details.
import { formatNumber, t } from "../i18n/i18n";

/** FLOPs to 3 significant digits, the large ones in words: "247 million FLOPs". */
export function flopsText(flops: number): string {
  const n = formatNumber(flops, { notation: "compact", compactDisplay: "long", maximumSignificantDigits: 3 });
  return t("estimate.flops", { n });
}

// Decimal units, as the "How we calculate" page states: 1 kB is 1,000 bytes.
const UNITS = [
  { unit: "megabyte", size: 1e6 },
  { unit: "kilobyte", size: 1e3 },
  { unit: "byte", size: 1 },
] as const;

/** Bytes to 3 significant digits, in the largest unit that keeps at least 1: "1.25 MB". */
export function bytesText(bytes: number): string {
  const { unit, size } = UNITS.find(({ size }) => bytes >= size) ?? UNITS.at(-1)!;
  return formatNumber(bytes / size, { style: "unit", unit, maximumSignificantDigits: 3 });
}

/** A share to 3 significant digits, so the attention's tiny share still shows. */
export function shareText(part: number, whole: number): string {
  return formatNumber(whole ? part / whole : 0, {
    style: "percent",
    minimumSignificantDigits: 1,
    maximumSignificantDigits: 3,
  });
}
