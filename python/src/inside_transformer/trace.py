"""The Trace: the Example file format and the Live API response (ADR 0001).

These Pydantic models are the single source of truth for the contract; the
JSON Schema exported from them is committed under `contract/`.
"""

import base64
import struct
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    PlainSerializer,
    PlainValidator,
    WithJsonSchema,
    model_validator,
)


def _decode_base64(value: object) -> bytes:
    if isinstance(value, bytes):
        return value
    if isinstance(value, str):
        return base64.b64decode(value, validate=True)
    raise ValueError("expected bytes or a base64 string")


# Typed arrays and raw bytes travel as standard base64 strings inside the JSON.
Base64Bytes = Annotated[
    bytes,
    PlainValidator(_decode_base64),
    PlainSerializer(lambda b: base64.b64encode(b).decode("ascii"), return_type=str),
    WithJsonSchema(
        {
            "type": "string",
            "contentEncoding": "base64",
            "pattern": "^[A-Za-z0-9+/]*={0,2}$",
        }
    ),
]


def _decode_float32s(value: object) -> tuple[float, ...]:
    if isinstance(value, (list, tuple)):
        return tuple(float(v) for v in value)
    raw = _decode_base64(value)
    if len(raw) % 4:
        raise ValueError("a float32 array must be a whole number of 4-byte values")
    return struct.unpack(f"<{len(raw) // 4}f", raw)


def _encode_float32s(values: tuple[float, ...]) -> str:
    return base64.b64encode(struct.pack(f"<{len(values)}f", *values)).decode("ascii")


# A float32 typed array: little-endian 4-byte floats, base64-encoded.
Float32Array = Annotated[
    tuple[float, ...],
    PlainValidator(_decode_float32s),
    PlainSerializer(_encode_float32s, return_type=str),
    WithJsonSchema(
        {
            "type": "string",
            "contentEncoding": "base64",
            "contentMediaType": "application/x-float32-le",
            "pattern": "^[A-Za-z0-9+/]*={0,2}$",
        }
    ),
]


def _decode_int8s(value: object) -> tuple[int, ...]:
    if isinstance(value, (list, tuple)):
        return tuple(int(v) for v in value)
    raw = _decode_base64(value)
    return struct.unpack(f"<{len(raw)}b", raw)


def _encode_int8s(values: tuple[int, ...]) -> str:
    return base64.b64encode(struct.pack(f"<{len(values)}b", *values)).decode("ascii")


# An int8 typed array: one signed byte per value, base64-encoded.
Int8Array = Annotated[
    tuple[int, ...],
    PlainValidator(_decode_int8s),
    PlainSerializer(_encode_int8s, return_type=str),
    WithJsonSchema(
        {
            "type": "string",
            "contentEncoding": "base64",
            "contentMediaType": "application/x-int8",
            "pattern": "^[A-Za-z0-9+/]*={0,2}$",
        }
    ),
]


def _to_float32(value: object) -> float:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError("expected a number")
    return struct.unpack("<f", struct.pack("<f", value))[0]


def _shortest_float32(value: float) -> float:
    """The shortest decimal that reads back as the same float32."""
    for digits in range(1, 10):
        shortest = float(f"{value:.{digits}g}")
        if _to_float32(shortest) == value:
            return shortest
    return value


# A float32 scalar, written as a JSON number with as few digits as round-trip it.
Float32 = Annotated[
    float,
    PlainValidator(_to_float32),
    PlainSerializer(_shortest_float32, return_type=float),
    WithJsonSchema({"type": "number"}),
]


class _Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, protected_namespaces=())


class ModelConfig(_Contract):
    """The model config values the Trace was built with."""

    vocab_size: int
    n_positions: int
    n_embd: int
    n_layer: int
    n_head: int


class TraceHeader(_Contract):
    model_id: str
    model_revision: str
    config: ModelConfig


class Token(_Contract):
    """A token of the vocabulary: its ID, its text and its raw bytes."""

    token_id: int
    token_text: str
    token_bytes: Base64Bytes


class TopTokens(_Contract):
    """The most likely next tokens, most likely first, with their probabilities in the same order."""

    tokens: list[Token]
    probabilities: Float32Array

    @model_validator(mode="after")
    def _one_probability_per_token(self) -> "TopTokens":
        if len(self.tokens) != len(self.probabilities):
            raise ValueError("expected one probability per token")
        return self


class Embedding(_Contract):
    """An n_embd-dimension embedding vector: all of it as int8 for drawing, its
    first dimensions exactly, and its norm."""

    # Each dimension is about values[i] * scale; scale is the largest absolute value / 127.
    values: Int8Array
    scale: Float32
    # The first 16 dimensions as exact float32.
    first_dimensions: Float32Array
    # The Euclidean norm of the whole vector.
    norm: Float32


class PositionRecord(_Contract):
    """Everything recorded for one Position."""

    token_id: int
    token_text: str
    token_bytes: Base64Bytes
    # The token's row of the token embedding table, and this Position's row of the
    # position embedding table; their sum is what enters the first block.
    token_embedding: Embedding
    position_embedding: Embedding
    # The top-10 next-token predictions made at this Position.
    predictions: TopTokens


class Trace(_Contract):
    """Every recorded value for a Prompt and its Steps."""

    header: TraceHeader
    # The Prompt is the first prompt_length Positions; the Continuation follows, one Position per Step.
    prompt_length: int
    positions: list[PositionRecord]
