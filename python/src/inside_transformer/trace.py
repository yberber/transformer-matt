"""The Trace: the Example file format and the Live API response (ADR 0001).

These Pydantic models are the single source of truth for the contract; the
JSON Schema exported from them is committed under `contract/`.
"""

import base64
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer, PlainValidator, WithJsonSchema


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


class PositionRecord(_Contract):
    """Everything recorded for one Position."""

    token_id: int
    token_text: str
    token_bytes: Base64Bytes


class Trace(_Contract):
    """Every recorded value for a Prompt and its Steps."""

    header: TraceHeader
    positions: list[PositionRecord]
