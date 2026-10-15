"""Checks on the committed Example files, the seam between regeneration and the web app."""

import base64
import json

import pytest
from transformers import AutoTokenizer

from regenerate import DATA_DIR, EXAMPLES, EXAMPLES_DIR, write_data

# Independent of the core on purpose: these literals restate the spec's pins.
MODEL_ID = "openai-community/gpt2"
MODEL_REVISION = "607a30d783dfa663caf39e06633721c8d4cfcd7e"
ENDOFTEXT_ID = 50256


@pytest.fixture(scope="module")
def reference_tokenizer():
    return AutoTokenizer.from_pretrained(MODEL_ID, revision=MODEL_REVISION)


def read_example(example_id: str) -> dict:
    return json.loads((EXAMPLES_DIR / f"{example_id}.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_example_tokens_match_a_default_hugging_face_tokenization(example, reference_tokenizer):
    trace = read_example(example.id)
    positions = trace["positions"]

    expected_ids = reference_tokenizer(example.prompt)["input_ids"]
    assert [p["token_id"] for p in positions] == expected_ids
    assert [p["token_text"] for p in positions] == [
        reference_tokenizer.decode([i]) for i in expected_ids
    ]
    raw = b"".join(base64.b64decode(p["token_bytes"], validate=True) for p in positions)
    assert raw == example.prompt.encode("utf-8")


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_no_endoftext_token_is_prepended(example):
    first = read_example(example.id)["positions"][0]
    assert first["token_id"] != ENDOFTEXT_ID


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_header_names_the_pinned_model_and_its_config(example):
    header = read_example(example.id)["header"]
    assert header["model_id"] == MODEL_ID
    assert header["model_revision"] == MODEL_REVISION
    assert header["config"] == {
        "vocab_size": 50257,
        "n_positions": 1024,
        "n_embd": 768,
        "n_layer": 12,
        "n_head": 12,
    }


def test_regenerating_produces_byte_identical_files(tmp_path):
    write_data(tmp_path)

    def snapshot(root):
        return {p.relative_to(root): p.read_bytes() for p in sorted(root.rglob("*")) if p.is_file()}

    assert snapshot(tmp_path) == snapshot(DATA_DIR)


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_example_file_is_under_300_kb_brotli_compressed(example):
    assert (EXAMPLES_DIR / f"{example.id}.json.br").stat().st_size < 300_000
