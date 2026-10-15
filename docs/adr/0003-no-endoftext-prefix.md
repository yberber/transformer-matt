# No `<|endoftext|>` token is prepended to the Prompt

GPT-2 was trained on documents separated by `<|endoftext|>`, so prepending it would arguably be more faithful, but Hugging Face `transformers` does not add it by default and the acceptance criterion is a match against a default Hugging Face reference run. We match the reference. As a consequence the first Position acts as an attention sink and its own next-token prediction is weak; the attention view explains this rather than hiding it.
