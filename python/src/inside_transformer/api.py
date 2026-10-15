"""The inference server's requests and responses: the Live API half of the contract.

Like the Trace, these Pydantic models are the single source of truth; the JSON
Schema exported from them is committed under `contract/`.
"""

from typing import Annotated, Literal

from pydantic import AfterValidator, Field, model_validator

from inside_transformer.trace import Contract, PositionRecord, Token, TraceHeader, check_per_layer_values

# Live mode runs a Prompt of at most this many tokens …
MAX_PROMPT_TOKENS = 64
# … for at most this many Steps.
MAX_CONTINUATION_TOKENS = 64
# GPT-2's vocabulary has token IDs 0 … 50256.
VOCABULARY_SIZE = 50257
# GPT-2's longest token is 128 bytes, so text of more characters than this is
# certainly over the limit and is rejected without tokenizing it.
MAX_PROMPT_CHARACTERS = MAX_PROMPT_TOKENS * 128


def _is_unicode(text: str) -> str:
    text.encode("utf-8")  # A lone surrogate from a JSON escape fails here.
    return text


Prompt = Annotated[str, AfterValidator(_is_unicode), Field(description="Prompt text.")]


class TokenizeRequest(Contract):
    prompt: Prompt


class TokenizeResponse(Contract):
    """The Prompt's tokens in order, and how many there are (which may exceed the limit)."""

    tokens: list[Token]
    count: int


# How many Steps to take: 0 runs the sequence so far only (prefill), 1 is the normal
# next token, and N restores a shared Live link in one request. The schema states the
# maximum; the server rejects more with `continuation_too_long`, as it does any request
# whose Continuation would exceed the limit.
Advance = Annotated[int, Field(ge=0, json_schema_extra={"maximum": MAX_CONTINUATION_TOKENS})]


class PromptStepRequest(Contract):
    """Run the Prompt text and take `advance` Steps; the response starts at Position 0."""

    prompt: Prompt
    advance: Advance


class TokenStepRequest(Contract):
    """Continue a sequence: the token IDs so far (Prompt then Continuation), of which
    the first `prompt_length` are the Prompt. The response holds only the `advance`
    new Positions. Continuation text is never re-tokenized, so the IDs travel as they are."""

    token_ids: list[Annotated[int, Field(ge=0, lt=VOCABULARY_SIZE)]]
    prompt_length: Annotated[int, Field(ge=0)]
    advance: Advance


StepRequest = PromptStepRequest | TokenStepRequest


class StepResponse(Contract):
    """The records of the Positions a Step request added, in a Trace's shape (ADR 0001):
    a Trace's Positions from `first_position` on. Appending them to the Positions
    before it gives the Trace; with `first_position` 0 the response is a whole Trace."""

    header: TraceHeader
    prompt_length: int
    first_position: int
    positions: list[PositionRecord]

    @model_validator(mode="after")
    def _per_layer_values_for_every_layer(self) -> "StepResponse":
        check_per_layer_values(self.header, self.positions, self.first_position)
        return self


class Health(Contract):
    """Whether the server can run the model: "loading" (503) until the model is
    loaded, then "ready" (200)."""

    status: Literal["loading", "ready"]


ErrorCode = Literal[
    # The Prompt has more than MAX_PROMPT_TOKENS tokens.
    "prompt_too_long",
    # The run would have more than MAX_CONTINUATION_TOKENS Continuation tokens.
    "continuation_too_long",
    # The Prompt has no tokens.
    "empty_prompt",
    # The request does not match the API, such as a missing field or an unknown token ID.
    "invalid_request",
    # The model is still loading; retry once Health reports ready.
    "model_loading",
    # No such endpoint, or not with this HTTP method.
    "not_found",
    "method_not_allowed",
]


class Error(Contract):
    """Every non-2xx response except Health's 503. `message` is for developers; the
    web app words its own message from `code`."""

    code: ErrorCode
    message: str


API_MODELS = [TokenizeRequest, TokenizeResponse, PromptStepRequest, TokenStepRequest, StepResponse, Health, Error]
