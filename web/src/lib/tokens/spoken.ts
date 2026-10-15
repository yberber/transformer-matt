// A token in plain words, where the visible markers (·, ↵, →, byte boxes) cannot be
// drawn: screen-reader announcements and native select options. A leading space is
// dropped, since the Position number that goes with it tells tokens apart.
import { t } from "../i18n/i18n";
import { displayParts, hex, type DisplayPart } from "./display";

function spokenPart(part: DisplayPart): string {
  switch (part.kind) {
    case "text":
      return part.text;
    case "space":
      return " ";
    case "newline":
      return ` ${t("token.newline")} `;
    case "tab":
      return ` ${t("token.tab")} `;
    case "bytes":
      return ` ${hex(part.bytes)} `;
  }
}

export function spokenToken(bytes: Uint8Array): string {
  const text = displayParts(bytes).map(spokenPart).join("").replace(/\s+/g, " ").trim();
  return text || t("token.space");
}
