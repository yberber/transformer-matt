// English is the source language; tr.ts and de.ts translate every key.
// {name} is a parameter. [[term|text]] marks a technical term: the text stays in
// English in every language and opens a short explanation (term.<term>) in the
// reader's language. Keys ending in .one / .other are plural forms.
export const en = {
  "site.title": "Inside the Transformer",
  "site.kicker": "GPT-2 small · 124M parameters",
  "site.tagline":
    "Watch a real language model, GPT-2 small, turn a piece of text into its continuation, with the real numbers behind every step.",
  "note.completion":
    "GPT-2 is a text-completion model, not a chat assistant: it does not answer questions, it continues whatever text it is given.",
  "note.english":
    "The Examples are in English because GPT-2 was trained almost entirely on English web text; in other languages its continuations are much weaker.",

  "lang.label": "Language",
  "example.label": "Example",
  "example.band.short": "Short",
  "example.band.medium": "Medium",
  "example.band.long": "Long",
  "step.controls": "Steps",
  "step.label": "Step",
  "step.previous": "Previous Step",
  "step.next": "Next token",
  "step.of": "Step {step} of {steps}",
  "step.end": "All {steps} precomputed Steps of this Example are shown, so there is no next token to add.",
  "theme.dark": "Dark theme",
  "share.copy": "Copy link",
  "share.copied": "Link copied",
  "share.fallbackLabel": "Link to this view",
  "share.fallbackHint": "Press Ctrl+C (⌘C on a Mac) to copy it.",

  "pipeline.label": "Pipeline",
  "pipeline.inlet": "in",
  "pipeline.return": "the chosen token is fed back in",
  "stage.tokenize": "Tokenize",
  "stage.embed": "Embed",
  "stage.blocks": "Blocks",
  "stage.predict": "Predict",
  "stage.spec.tokens.one": "{n} token",
  "stage.spec.tokens.other": "{n} tokens",
  "stage.spec.layers": "{n} layers",
  "stage.spec.predict": "top 10 of {n}",

  "term.token": "the unit of text the model reads: a word, part of a word, or a symbol",
  "term.embedding": "a list of numbers that stands for a token",
  "term.attention": "the step in which each token gathers information from earlier tokens",
  "term.layer": "one of the 12 identical stages the numbers pass through",

  "view.number": "No. {n}",
  "view.showDetails": "Show details",
  "view.loading": "Loading the Example…",
  "view.loadError": "The Example could not be loaded.",
  "view.pending":
    "This view is still being built. For now, its details show the model's own numbers from its config.",
  "view.configSource": "From the config of {model} at revision {revision}.",
  "view.tokenize.lead":
    "The model never sees letters or words: it splits the Prompt into [[token|tokens]], and each token is a number.",
  "view.embed.lead":
    "Each token is looked up in a table and becomes a list of {width} numbers, its [[embedding|embedding]]; a second embedding for its Position is added on top.",
  "view.blocks.lead":
    "The numbers pass through {layers} identical [[layer|layers]]: in each one, [[attention|attention]] lets every token gather information from earlier tokens, then a small network reworks each token on its own.",
  "view.predict.lead":
    "At the last Position the model gives each of its {vocabulary} tokens a probability, and greedy decoding always appends the most likely one.",

  "tokens.listLabel": "Tokens",
  "tokens.prompt": "Prompt",
  "tokens.continuation": "Continuation",
  "tokens.hint": "Hover over a token, or focus it and use the arrow keys, to see what the model predicted at its Position.",
  "prediction.at": "Prediction at Position {n}",
  "prediction.actual": "What actually comes next:",
  "prediction.actualRank": "rank {rank}, {probability}",
  "prediction.notInTop": "not in the top 10",

  "predict.sequenceLabel": "Sequence so far",
  "predict.next": "next",
  "predict.rankedLabel": "Top 10 next tokens",
  "predict.rest": "other {n} tokens",
  "predict.scale": "Bars are scaled to the most likely token.",
  "predict.greedy":
    "Decoding is greedy: the most likely token is always the one appended, so the same Prompt always gives the same Continuation.",
  "predict.detailsNote": "Probabilities are over all {vocabulary} tokens; the top 10 add up to {sum}.",
  "embed.listLabel": "Embeddings per Position",
  "embed.added":
    "The token embedding and the position embedding are added number by number, and their sum is what enters the first block.",
  "embed.legend":
    "Each strip is one vector, its {width} numbers from left to right. Positive numbers are drawn in the token's color and negative ones in gray, stronger the further they are from 0.",
  "embed.scaleLow": "{value} or less",
  "embed.scaleHigh": "{value} or more",
  "embed.token": "Token embedding",
  "embed.position": "Position embedding",
  "embed.sum": "Sum, into block 1",
  "embed.tokenStrip": "Token embedding at Position {n}",
  "embed.positionStrip": "Position embedding at Position {n}",
  "embed.sumStrip": "Sum at Position {n}, which enters the first block",
  "embed.truncated":
    "Truncated view: the first {shown} of {width} dimensions of each vector. The norm, the vector's length, is over all {width}.",
  "embed.sumNote":
    "The sum's first {shown} dimensions are added here exactly as the model adds them. Its norm is left out: that needs all {width} dimensions exactly, and the Trace carries only the first {shown}.",
  "embed.tables":
    "The token embedding table has {vocabulary} rows of {width} numbers, one per token; the position embedding table has {positions} rows, one per Position the model can read.",
  "table.vector": "Vector",
  "table.firstDimensions": "First {n} dimensions",
  "table.norm": "Norm",
  "table.rank": "Rank",
  "table.prediction": "Top prediction",
  "table.probability": "Probability",
  "table.position": "Position",
  "table.token": "Token",
  "table.tokenId": "Token ID",
  "table.bytes": "Bytes",
  "token.space": "space",
  "token.newline": "newline",
  "token.tab": "tab",
  "token.partialBytes":
    "Bytes {bytes} are part of a character: a single character can take up to 4 bytes, and here they are split across neighbouring tokens.",

  "config.vocab_size": "Vocabulary size: the tokens the model knows",
  "config.n_positions": "Longest text the model can read, in tokens",
  "config.n_embd": "Numbers per token (embedding width)",
  "config.n_layer": "Layers",
  "config.n_head": "Attention heads per layer",
  "config.head_dim": "Numbers per attention head",
};

export type MessageKey = keyof typeof en;
