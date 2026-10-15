"""The Python core: tokenizes Prompts, runs GPT-2 and builds Traces.

Both the regeneration script and the inference server call this package (ADR 0001).
"""

from contextlib import contextmanager
from functools import cache

import torch
from transformers import AutoConfig, AutoModelForCausalLM, AutoTokenizer
from transformers.convert_slow_tokenizer import bytes_to_unicode

from inside_transformer.trace import (
    Embedding,
    ModelConfig,
    PositionRecord,
    Token,
    TopTokens,
    Trace,
    TraceHeader,
)

MODEL_ID = "openai-community/gpt2"
MODEL_REVISION = "607a30d783dfa663caf39e06633721c8d4cfcd7e"
TOP_PREDICTIONS = 10
# The logit lens keeps this many tokens per layer.
LOGIT_LENS_TOKENS = 5
# Embeddings carry this many leading dimensions exactly; the rest only as int8.
EXACT_DIMENSIONS = 16
INT8_MAX = 127
# Attention weights travel as round(weight × 255).
ATTENTION_STEPS = 255

__all__ = ["MODEL_ID", "MODEL_REVISION", "Trace", "build_trace"]


@cache
def _tokenizer():
    return AutoTokenizer.from_pretrained(MODEL_ID, revision=MODEL_REVISION)


@cache
def _model():
    # Eager attention, because the default SDPA kernel does not return attention weights.
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID, revision=MODEL_REVISION, dtype=torch.float32, attn_implementation="eager"
    )
    return model.eval()


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


def _token(token_id: int) -> Token:
    raw = bytes(_byte_decoder()[char] for char in _tokenizer().convert_ids_to_tokens(token_id))
    return Token(token_id=token_id, token_text=raw.decode("utf-8", errors="replace"), token_bytes=raw)


def _top_tokens(logits: torch.Tensor, k: int = TOP_PREDICTIONS) -> TopTokens:
    top = torch.softmax(logits, dim=-1).topk(k)
    return TopTokens(
        tokens=[_token(i) for i in top.indices.tolist()],
        probabilities=tuple(top.values.tolist()),
    )


def _embedding(vector: torch.Tensor) -> Embedding:
    """Quantizes the vector to int8 with one scale for the whole vector."""
    scale = vector.abs().max() / INT8_MAX
    values = (vector / scale).round() if scale > 0 else torch.zeros_like(vector)
    return Embedding(
        values=tuple(values.to(torch.int8).tolist()),
        scale=scale.item(),
        first_dimensions=tuple(vector[:EXACT_DIMENSIONS].tolist()),
        norm=torch.linalg.vector_norm(vector).item(),
    )


def _attention(rows: torch.Tensor) -> tuple[int, ...]:
    """Quantizes one Position's attention rows, [layer, head, key Position], to uint8."""
    return tuple((rows * ATTENTION_STEPS).round().to(torch.uint8).flatten().tolist())


@contextmanager
def _recording_layers():
    """Records, for every forward pass inside the block, each layer's residual stream
    where the MLP reads it, the MLP's output, and the block's output: each a list of
    [Position, dimension] tensors, one per layer, for the pass's new Positions."""
    layers = {"residual": [], "mlp_output": [], "block_output": []}
    hooks = []
    for block in _model().transformer.h:
        hooks += [
            block.ln_2.register_forward_pre_hook(lambda _, args: layers["residual"].append(args[0][0])),
            block.mlp.register_forward_hook(lambda _, __, output: layers["mlp_output"].append(output[0])),
            block.register_forward_hook(lambda _, __, output: layers["block_output"].append(output[0])),
        ]
    try:
        yield layers
    finally:
        for hook in hooks:
            hook.remove()


def _drain_layers(layers: dict[str, list[torch.Tensor]]) -> tuple[torch.Tensor, torch.Tensor]:
    """Turns one forward pass's recordings into the MLP impact [layer, Position] and the
    logit lens's logits [layer, Position, token], then clears them for the next pass."""
    residual, mlp_output, block_output = (torch.stack(layers[name]) for name in ("residual", "mlp_output", "block_output"))
    for recorded in layers.values():
        recorded.clear()
    model = _model()
    impact = torch.linalg.vector_norm(mlp_output, dim=-1) / torch.linalg.vector_norm(residual, dim=-1)
    return impact, model.lm_head(model.transformer.ln_f(block_output))


def _position(
    position: int,
    token_id: int,
    attention: torch.Tensor,
    mlp_impact: torch.Tensor,
    lens_logits: torch.Tensor,
    logits: torch.Tensor,
) -> PositionRecord:
    token = _token(token_id)
    transformer = _model().transformer
    return PositionRecord(
        token_id=token.token_id,
        token_text=token.token_text,
        token_bytes=token.token_bytes,
        token_embedding=_embedding(transformer.wte.weight[token_id]),
        position_embedding=_embedding(transformer.wpe.weight[position]),
        attention=_attention(attention),
        mlp_impact=tuple(mlp_impact.tolist()),
        logit_lens=[_top_tokens(layer, LOGIT_LENS_TOKENS) for layer in lens_logits],
        predictions=_top_tokens(logits),
    )


def build_trace(prompt: str, steps: int = 0) -> Trace:
    """Tokenize the Prompt (no `<|endoftext|>` prefix, ADR 0003), then advance it by
    `steps` greedy Steps, recording every Position.

    Each Step appends the top-1 prediction's token ID; Continuation text is never
    re-tokenized. The KV cache is reused across Steps.
    """
    prompt_ids = _tokenizer()(prompt)["input_ids"]
    model = _model()
    with torch.no_grad(), _recording_layers() as layers:
        output = model(torch.tensor([prompt_ids]), use_cache=True, output_attentions=True)
        # [layer, head, query Position, key Position]
        attention = torch.stack([layer[0] for layer in output.attentions])
        # [layer, Position] and [layer, Position, token]
        impact, lens_logits = _drain_layers(layers)
        positions = [
            _position(
                position,
                token_id,
                attention[:, :, position, : position + 1],
                impact[:, position],
                lens_logits[:, position],
                logits,
            )
            for position, (token_id, logits) in enumerate(zip(prompt_ids, output.logits[0]))
        ]
        for _ in range(steps):
            next_id = positions[-1].predictions.tokens[0].token_id
            output = model(
                torch.tensor([[next_id]]),
                past_key_values=output.past_key_values,
                use_cache=True,
                output_attentions=True,
            )
            attention = torch.stack([layer[0, :, 0] for layer in output.attentions])
            impact, lens_logits = _drain_layers(layers)
            positions.append(
                _position(len(positions), next_id, attention, impact[:, 0], lens_logits[:, 0], output.logits[0, -1])
            )
    return Trace(
        header=TraceHeader(model_id=MODEL_ID, model_revision=MODEL_REVISION, config=_config()),
        prompt_length=len(prompt_ids),
        positions=positions,
    )
