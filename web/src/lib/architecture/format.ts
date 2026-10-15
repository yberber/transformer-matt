// How the architecture view writes shapes, counts and shares, in the reader's language.
import { formatNumber, t } from "../i18n/i18n";
import type { Tensor } from "../estimates/parameters";

export function shapeText(shape: number[]): string {
  return shape.map((n) => formatNumber(n)).join(" × ");
}

/** A share of all parameters to 3 significant digits, so a LayerNorm's tiny share still shows. */
export function shareText(count: number, total: number): string {
  return formatNumber(count / total, { style: "percent", minimumSignificantDigits: 3, maximumSignificantDigits: 3 });
}

/** The tensor's name in the UI, with its block when it sits in one (counted from 0). */
export function tensorLabel({ part, kind }: Tensor, layer?: number): string {
  const label = t("arch.tensor", { part: t(`arch.part.${part}`), kind: t(`arch.kind.${kind}`) });
  return layer === undefined ? label : t("arch.inBlock", { n: layer + 1, tensor: label });
}
