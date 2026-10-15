"""The Python core: tokenizes Prompts, runs GPT-2 and builds Traces.

Both the regeneration script and the inference server call this package (ADR 0001).
"""

from functools import cache

from transformers import AutoConfig, AutoTokenizer
from transformers.convert_slow_tokenizer import bytes_to_unicode

from inside_transformer.trace import ModelConfig, PositionRecord, Trace, TraceHeader

MODEL_ID = "openai-community/gpt2"
MODEL_REVISION = "607a30d783dfa663caf39e06633721c8d4cfcd7e"

__all__ = ["MODEL_ID", "MODEL_REVISION", "Trace", "build_trace"]


@cache
def _tokenizer():
    return AutoTokenizer.from_pretrained(MODEL_ID, revision=MODEL_REVISION)


@cache
def _config() -> ModelConfig:
    config = AutoConfig.from_pretrained(MODEL_ID, revision=MODEL_REVISION)
    return ModelConfig(
        vocab_size=config.vocab_size,
        n_positions=config.n_positions,
        n_embd=config.n_embd,
        n_layer=config.n_layer,
        n_head=config.n_head,
    )


@cache
def _byte_decoder() -> dict[str, int]:
    """GPT-2's byte-level BPE stores each byte as a printable character; this undoes that."""
    return {char: byte for byte, char in bytes_to_unicode().items()}


def _token_bytes(token: str) -> bytes:
    decoder = _byte_decoder()
    return bytes(decoder[char] for char in token)


def build_trace(prompt: str) -> Trace:
    """Tokenize the Prompt (no `<|endoftext|>` prefix, ADR 0003) and record each Position."""
    tokenizer = _tokenizer()
    token_ids = tokenizer(prompt)["input_ids"]
    positions = []
    for token_id, token in zip(token_ids, tokenizer.convert_ids_to_tokens(token_ids)):
        raw = _token_bytes(token)
        positions.append(
            PositionRecord(
                token_id=token_id,
                token_text=raw.decode("utf-8", errors="replace"),
                token_bytes=raw,
            )
        )
    return Trace(
        header=TraceHeader(model_id=MODEL_ID, model_revision=MODEL_REVISION, config=_config()),
        positions=positions,
    )
