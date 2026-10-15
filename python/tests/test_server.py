"""The inference server's HTTP API, against the real model: every response must
validate against the committed contract schema."""

import base64
import json
import logging
import socket
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import httpx
import pytest
import uvicorn
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

from inside_transformer.schema import API_SCHEMA_PATH
from regenerate import EXAMPLES
from server import create_app, uvicorn_config
from test_example_files import STEPS, assert_same_trace, read_example

API_SCHEMA = json.loads(API_SCHEMA_PATH.read_text(encoding="utf-8"))
REGISTRY = Registry().with_resource("api", Resource.from_contents(API_SCHEMA))


def assert_valid(response, definition: str) -> dict:
    """The response body validates against `definition` in the committed API schema."""
    body = response.json()
    validator = Draft202012Validator({"$ref": f"api#/$defs/{definition}"}, registry=REGISTRY)
    errors = [error.message for error in validator.iter_errors(body)]
    assert not errors, errors
    return body


def example_prompt(example_id: str) -> str:
    return next(example.prompt for example in EXAMPLES if example.id == example_id)


def wait_until_ready(client: httpx.Client, timeout: float = 120.0):
    """Polls Health until it stops reporting the model as loading; returns its last response."""
    deadline = time.monotonic() + timeout
    while (response := client.get("/health")).status_code == 503 and time.monotonic() < deadline:
        time.sleep(0.05)
    return response


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app()) as client:
        assert wait_until_ready(client).status_code == 200
        yield client


def test_health_is_503_while_the_model_loads_and_ready_afterwards():
    loaded = threading.Event()
    with TestClient(create_app(load_model=loaded.wait)) as loading:
        response = loading.get("/health")
        assert response.status_code == 503
        assert assert_valid(response, "Health") == {"status": "loading"}

        loaded.set()
        response = wait_until_ready(loading)
        assert response.status_code == 200
        assert assert_valid(response, "Health") == {"status": "ready"}


def test_tokenize_and_step_are_503_while_the_model_loads():
    with TestClient(create_app(load_model=threading.Event().wait)) as loading:
        for path, request in (("/tokenize", {"prompt": "Hello"}), ("/step", {"prompt": "Hello", "advance": 1})):
            response = loading.post(path, json=request)
            assert response.status_code == 503
            assert assert_valid(response, "Error")["code"] == "model_loading"


def test_tokenize_returns_each_token_with_its_id_text_and_bytes_and_the_count(client):
    example = read_example("baker")
    response = client.post("/tokenize", json={"prompt": example_prompt("baker")})

    assert response.status_code == 200
    body = assert_valid(response, "TokenizeResponse")
    prompt_positions = example["positions"][: example["prompt_length"]]
    assert body["count"] == example["prompt_length"] == len(body["tokens"])
    assert body["tokens"] == [
        {key: position[key] for key in ("token_id", "token_text", "token_bytes")} for position in prompt_positions
    ]


def test_tokenize_shows_the_bytes_of_tokens_that_are_part_of_a_character(client):
    prompt = "Kedi ağaçta uyuyor 🐈"
    body = assert_valid(client.post("/tokenize", json={"prompt": prompt}), "TokenizeResponse")

    raw = [base64.b64decode(token["token_bytes"]) for token in body["tokens"]]
    assert b"".join(raw) == prompt.encode("utf-8")
    # The cat emoji is four bytes that GPT-2 splits across tokens.
    assert any("\N{REPLACEMENT CHARACTER}" in token["token_text"] for token in body["tokens"])


def test_tokenize_counts_a_prompt_over_the_limit(client):
    body = assert_valid(client.post("/tokenize", json={"prompt": " ".join(["word"] * 70)}), "TokenizeResponse")
    assert body["count"] == len(body["tokens"]) == 70


def test_tokenize_and_step_reject_a_prompt_too_long_to_tokenize(client):
    # No GPT-2 token is longer than 128 bytes, so this is far more than 64 tokens.
    prompt = "x" * (64 * 128 + 1)
    for path, request in (("/tokenize", {"prompt": prompt}), ("/step", {"prompt": prompt, "advance": 0})):
        response = client.post(path, json=request)
        assert response.status_code == 422
        assert assert_valid(response, "Error")["code"] == "prompt_too_long"


def as_trace(step_response: dict) -> dict:
    """A Step response without its first Position: the Trace shape of an Example file."""
    return {key: value for key, value in step_response.items() if key != "first_position"}


def example_slice(example: dict, start: int, stop: int) -> dict:
    """The Example's Trace, cut to Positions start … stop - 1."""
    return {**example, "positions": example["positions"][start:stop]}


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_step_with_prompt_text_and_advance_16_matches_the_example_file(client, example):
    response = client.post("/step", json={"prompt": example.prompt, "advance": STEPS})

    assert response.status_code == 200
    body = assert_valid(response, "StepResponse")
    assert body["first_position"] == 0
    assert_same_trace(as_trace(body), read_example(example.id))


def test_step_with_advance_0_is_prefill_only(client):
    example = read_example("village")
    body = assert_valid(client.post("/step", json={"prompt": example_prompt("village"), "advance": 0}), "StepResponse")

    assert body["first_position"] == 0
    assert_same_trace(as_trace(body), example_slice(example, 0, example["prompt_length"]))


@pytest.mark.parametrize("advance", [0, 1, 3])
def test_step_with_token_ids_returns_only_the_new_positions(client, advance):
    example = read_example("buttons")
    prompt_length = example["prompt_length"]
    so_far = prompt_length + 5
    token_ids = [position["token_id"] for position in example["positions"][:so_far]]

    response = client.post("/step", json={"token_ids": token_ids, "prompt_length": prompt_length, "advance": advance})

    assert response.status_code == 200
    body = assert_valid(response, "StepResponse")
    assert body["first_position"] == so_far
    assert_same_trace(as_trace(body), example_slice(example, so_far, so_far + advance))


def test_step_runs_a_64_token_prompt_for_64_steps(client):
    prompt = " ".join(["word"] * 64)
    body = assert_valid(client.post("/step", json={"prompt": prompt, "advance": 64}), "StepResponse")
    assert body["prompt_length"] == 64
    assert len(body["positions"]) == 128


def word_ids(count: int) -> list[int]:
    """The token IDs of `count` words: "word", then " word" repeated."""
    return [4775] + [1573] * (count - 1)


@pytest.mark.parametrize(
    ("request_body", "code"),
    [
        pytest.param(
            {"prompt": " ".join(["word"] * 65), "advance": 0},
            "prompt_too_long",
            id="Prompt text over 64 tokens",
        ),
        pytest.param(
            {"token_ids": word_ids(65), "prompt_length": 65, "advance": 0},
            "prompt_too_long",
            id="token IDs with a Prompt over 64 tokens",
        ),
        pytest.param({"prompt": "Hello", "advance": 65}, "continuation_too_long", id="Prompt text advanced 65 Steps"),
        pytest.param(
            {"token_ids": word_ids(8 + 60), "prompt_length": 8, "advance": 5},
            "continuation_too_long",
            id="token IDs advanced past 64 Continuation tokens",
        ),
        pytest.param(
            {"token_ids": word_ids(8 + 65), "prompt_length": 8, "advance": 0},
            "continuation_too_long",
            id="token IDs already past 64 Continuation tokens",
        ),
        pytest.param({"prompt": "", "advance": 1}, "empty_prompt", id="empty Prompt text"),
        pytest.param({"token_ids": [], "prompt_length": 0, "advance": 1}, "empty_prompt", id="no token IDs"),
        pytest.param(
            {"token_ids": word_ids(3), "prompt_length": 0, "advance": 1},
            "empty_prompt",
            id="token IDs with an empty Prompt",
        ),
        pytest.param(
            {"token_ids": word_ids(3), "prompt_length": 4, "advance": 1},
            "invalid_request",
            id="prompt_length longer than token_ids",
        ),
        pytest.param(
            {"token_ids": [50257], "prompt_length": 1, "advance": 1},
            "invalid_request",
            id="token ID outside the vocabulary",
        ),
        pytest.param({"token_ids": [-1], "prompt_length": 1, "advance": 1}, "invalid_request", id="negative token ID"),
        pytest.param({"prompt": "Hello", "advance": -1}, "invalid_request", id="negative advance"),
        pytest.param({"prompt": "Hello"}, "invalid_request", id="no advance"),
        pytest.param(
            {"prompt": "Hello", "token_ids": word_ids(1), "prompt_length": 1, "advance": 1},
            "invalid_request",
            id="both Prompt text and token IDs",
        ),
    ],
)
def test_step_rejects_a_bad_request_with_an_explicit_error_code(client, request_body, code):
    response = client.post("/step", json=request_body)
    assert response.status_code == 422
    assert assert_valid(response, "Error")["code"] == code


def test_step_accepts_exactly_64_continuation_tokens(client):
    body = assert_valid(
        client.post("/step", json={"token_ids": word_ids(8 + 60), "prompt_length": 8, "advance": 4}), "StepResponse"
    )
    assert body["first_position"] == 68
    assert len(body["positions"]) == 4


@pytest.mark.parametrize(
    "content",
    [b"advance=1", rb'{"prompt": "\ud800", "advance": 1}'],
    ids=["not JSON", "lone surrogate"],
)
def test_a_request_that_is_not_json_text_is_an_invalid_request(client, content):
    response = client.post("/step", content=content, headers={"content-type": "application/json"})
    assert response.status_code == 422
    assert assert_valid(response, "Error")["code"] == "invalid_request"


def test_an_unknown_path_is_not_found(client):
    response = client.get("/nowhere")
    assert response.status_code == 404
    assert assert_valid(response, "Error")["code"] == "not_found"


def test_no_prompt_text_appears_in_any_log_record(monkeypatch, capfd):
    """Runs the real server, as `uv run serve` configures it, through requests that
    succeed and requests that fail, and searches every log record and everything
    written to stdout and stderr for the Prompt's words. Every level is switched on,
    so a debug call that would leak with `--log-level debug` fails too."""
    words = ["Zanzibar", "marmalade", "quokka"]
    prompt = " ".join(words)
    records: list[logging.LogRecord] = []
    make_record = logging.Logger.makeRecord

    def recording(self, *args, **kwargs):
        record = make_record(self, *args, **kwargs)
        # The test's own HTTP client logs the URLs it requests.
        if not record.name.startswith(("httpx", "httpcore")):
            records.append(record)
        return record

    monkeypatch.setattr(logging.Logger, "makeRecord", recording)
    monkeypatch.setattr(logging.Logger, "isEnabledFor", lambda self, level: True)
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    server = uvicorn.Server(uvicorn_config(create_app(), "127.0.0.1", port))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    try:
        with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=60) as http:
            deadline = time.monotonic() + 60
            while not server.started and time.monotonic() < deadline:
                time.sleep(0.05)
            assert wait_until_ready(http).status_code == 200

            responses = [
                http.post("/tokenize", json={"prompt": prompt}),
                http.post("/step", json={"prompt": prompt, "advance": 1}),
                http.post("/step", json={"prompt": " ".join([prompt] * 30), "advance": 0}),
                http.post("/step", json={"prompt": prompt, "advance": 65}),
                http.post("/step", json={"prompt": prompt, "advance": -1}),
                http.post("/step", json={"prompt": prompt, "token_ids": [1], "prompt_length": 1, "advance": 1}),
                http.post("/step", content=f"prompt={prompt}".encode(), headers={"content-type": "application/json"}),
                http.get("/tokenize", params={"prompt": prompt}),
                http.post("/nowhere", json={"prompt": prompt}),
            ]
    finally:
        server.should_exit = True
        thread.join(timeout=10)

    assert [response.status_code for response in responses] == [200, 200, 422, 422, 422, 422, 422, 405, 404]
    assert records, "expected the server to log something, such as its startup"
    output = capfd.readouterr()
    logged = [logging.Formatter().format(record) for record in records] + [output.out, output.err]
    leaks = [text for text in logged for word in words if word in text]
    assert not leaks, leaks


def test_concurrent_steps_each_match_their_example_file(client):
    """Forward passes run side by side in the thread pool, and must not mix up each
    other's recorded values."""
    with ThreadPoolExecutor(len(EXAMPLES)) as pool:
        responses = list(
            pool.map(lambda example: client.post("/step", json={"prompt": example.prompt, "advance": STEPS}), EXAMPLES)
        )
    for example, response in zip(EXAMPLES, responses):
        assert response.status_code == 200, example.id
        assert_same_trace(as_trace(assert_valid(response, "StepResponse")), read_example(example.id))
