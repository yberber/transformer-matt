// German, drafted from en.ts. Needs native-speaker review before release.
import type { MessageKey } from "./en";

export const de: Record<MessageKey, string> = {
  "site.title": "Inside the Transformer",
  "site.kicker": "GPT-2 small · 124 Mio. Parameter",
  "site.tagline":
    "Sehen Sie zu, wie ein echtes Sprachmodell, GPT-2 small, einen Text fortsetzt, mit den echten Zahlen hinter jedem Schritt.",
  "note.completion":
    "GPT-2 ist ein Modell zur Textvervollständigung, kein Chat-Assistent: Es beantwortet keine Fragen, sondern setzt den Text fort, den es bekommt.",
  "note.english":
    "Die Beispiele sind auf Englisch, weil GPT-2 fast ausschließlich mit englischen Webtexten trainiert wurde; in anderen Sprachen sind seine Fortsetzungen deutlich schwächer.",

  "lang.label": "Sprache",
  "example.label": "Beispiel",
  "example.band.short": "Kurz",
  "example.band.medium": "Mittel",
  "example.band.long": "Lang",
  "step.controls": "Schritte",
  "step.label": "Schritt",
  "step.previous": "Vorheriger Schritt",
  "step.next": "Nächstes Token",
  "step.of": "Schritt {step} von {steps}",
  "step.end": "Alle {steps} vorberechneten Schritte dieses Beispiels werden gezeigt, daher gibt es kein weiteres Token.",
  "theme.dark": "Dunkles Design",
  "share.copy": "Link kopieren",
  "share.copied": "Link kopiert",
  "share.fallbackLabel": "Link zu dieser Ansicht",
  "share.fallbackHint": "Zum Kopieren Strg+C (auf dem Mac ⌘C) drücken.",

  "pipeline.label": "Pipeline",
  "pipeline.inlet": "ein",
  "pipeline.return": "das gewählte Token wird wieder eingespeist",
  "stage.tokenize": "Tokenisieren",
  "stage.embed": "Embedding",
  "stage.blocks": "Blöcke",
  "stage.predict": "Vorhersage",
  "stage.spec.tokens.one": "{n} Token",
  "stage.spec.tokens.other": "{n} Tokens",
  "stage.spec.layers": "{n} Layer",
  "stage.spec.predict": "Top 10 von {n}",

  "term.token": "die Texteinheit, die das Modell liest: ein Wort, ein Wortteil oder ein Zeichen",
  "term.embedding": "eine Liste von Zahlen, die für ein Token steht",
  "term.attention": "der Schritt, in dem jedes Token Informationen von früheren Tokens sammelt",
  "term.layer": "eine der 12 gleich aufgebauten Stufen, die die Zahlen durchlaufen",

  "view.number": "Nr. {n}",
  "view.showDetails": "Details anzeigen",
  "view.loading": "Beispiel wird geladen…",
  "view.loadError": "Das Beispiel konnte nicht geladen werden.",
  "view.pending":
    "Diese Ansicht entsteht noch. Bis dahin zeigen ihre Details die Zahlen aus der Konfiguration des Modells.",
  "view.configSource": "Aus der Konfiguration von {model}, Revision {revision}.",
  "view.tokenize.lead":
    "Das Modell sieht nie Buchstaben oder Wörter: Es zerlegt den Prompt in [[token|Tokens]], und jedes Token ist eine Zahl.",
  "view.embed.lead":
    "Jedes Token wird in einer Tabelle nachgeschlagen und wird zu einer Liste aus {width} Zahlen, seinem [[embedding|Embedding]]; dazu wird ein zweites Embedding für seine Position addiert.",
  "view.blocks.lead":
    "Die Zahlen durchlaufen {layers} gleich aufgebaute [[layer|Layer]]: In jedem lässt [[attention|Attention]] jedes Token Informationen von früheren Tokens sammeln, danach überarbeitet ein kleines Netz jedes Token einzeln.",
  "view.predict.lead":
    "An der letzten Position gibt das Modell jedem seiner {vocabulary} Tokens eine Wahrscheinlichkeit, und Greedy-Decoding hängt immer das wahrscheinlichste an.",

  "tokens.listLabel": "Tokens",
  "tokens.prompt": "Prompt",
  "tokens.continuation": "Fortsetzung",
  "tokens.hint": "Fahren Sie mit der Maus über ein Token oder fokussieren Sie es und nutzen Sie die Pfeiltasten, um zu sehen, was das Modell an seiner Position vorhergesagt hat.",
  "prediction.at": "Vorhersage an Position {n}",
  "prediction.actual": "Tatsächlich folgt:",
  "prediction.actualRank": "Rang {rank}, {probability}",
  "prediction.notInTop": "nicht unter den Top 10",

  "predict.sequenceLabel": "Bisherige Folge",
  "predict.next": "nächstes",
  "predict.rankedLabel": "Top 10 der nächsten Tokens",
  "predict.rest": "übrige {n} Tokens",
  "predict.scale": "Die Balken sind relativ zum wahrscheinlichsten Token skaliert.",
  "predict.greedy":
    "Das Decoding ist greedy: Es wird immer das wahrscheinlichste Token angehängt, deshalb ergibt derselbe Prompt immer dieselbe Fortsetzung.",
  "predict.detailsNote": "Die Wahrscheinlichkeiten beziehen sich auf alle {vocabulary} Tokens; die Top 10 ergeben zusammen {sum}.",
  "table.rank": "Rang",
  "table.prediction": "Wahrscheinlichste Vorhersage",
  "table.probability": "Wahrscheinlichkeit",
  "table.position": "Position",
  "table.token": "Token",
  "table.tokenId": "Token-ID",
  "table.bytes": "Bytes",
  "token.space": "Leerzeichen",
  "token.newline": "Zeilenumbruch",
  "token.tab": "Tabulator",
  "token.partialBytes":
    "Die Bytes {bytes} sind Teil eines Zeichens: Ein Zeichen kann bis zu 4 Bytes belegen, und hier ist es auf benachbarte Tokens aufgeteilt.",

  "config.vocab_size": "Vokabulargröße: die Tokens, die das Modell kennt",
  "config.n_positions": "Längster Text, den das Modell lesen kann, in Tokens",
  "config.n_embd": "Zahlen pro Token (Embedding-Breite)",
  "config.n_layer": "Anzahl der Layer",
  "config.n_head": "Attention-Heads pro Layer",
  "config.head_dim": "Zahlen pro Attention-Head",
};
