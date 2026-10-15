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

  "tokenize.listLabel": "Prompt tokens",
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
