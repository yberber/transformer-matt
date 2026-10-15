"""Checks on the committed Example files, the seam between regeneration and the web app."""

import base64
import json
import struct

import pytest
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from regenerate import DATA_DIR, EXAMPLES, EXAMPLES_DIR, write_data

# Independent of the core on purpose: these literals restate the spec's pins.
MODEL_ID = "openai-community/gpt2"
MODEL_REVISION = "607a30d783dfa663caf39e06633721c8d4cfcd7e"
ENDOFTEXT_ID = 50256
TOP_K = 10
STEPS = 16
PROBABILITY_TOLERANCE = 1e-4

# The spec's selection rules, restated. The margin was lowered from 0.05 to 1e-3 so
# that natural prose can qualify (2026-10-15); 1e-3 still keeps every greedy choice
# clear of float differences between machines.
PROMPT_LENGTH_BANDS = {"short": (8, 12), "medium": (22, 28), "long": (44, 48)}
MIN_MARGIN = 1e-3


@pytest.fixture(scope="module")
def reference_tokenizer():
    return AutoTokenizer.from_pretrained(MODEL_ID, revision=MODEL_REVISION)


@pytest.fixture(scope="module")
def reference_model():
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID, revision=MODEL_REVISION, dtype=torch.float32
    )
    return model.eval()


@pytest.fixture(scope="module")
def reference_run(reference_tokenizer, reference_model):
    """A plain Hugging Face greedy run of each Example, memoized per Example: the
    Prompt plus 16 argmax tokens, then one forward pass over the whole sequence."""
    runs = {}

    def run(example):
        if example.id not in runs:
            token_ids = reference_tokenizer(example.prompt)["input_ids"]
            with torch.no_grad():
                for _ in range(STEPS):
                    next_logits = reference_model(torch.tensor([token_ids])).logits[0, -1]
                    token_ids.append(int(next_logits.argmax()))
                logits = reference_model(torch.tensor([token_ids])).logits[0]
            top = torch.softmax(logits, dim=-1).topk(TOP_K, dim=-1)
            runs[example.id] = {
                "token_ids": token_ids,
                "top_ids": top.indices.tolist(),
                "top_probabilities": top.values.tolist(),
            }
        return runs[example.id]

    return run


def float32s(encoded: str) -> list[float]:
    raw = base64.b64decode(encoded, validate=True)
    return list(struct.unpack(f"<{len(raw) // 4}f", raw))


def read_example(example_id: str) -> dict:
    return json.loads((EXAMPLES_DIR / f"{example_id}.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_prompt_tokens_match_a_default_hugging_face_tokenization(example, reference_tokenizer):
    trace = read_example(example.id)
    expected_ids = reference_tokenizer(example.prompt)["input_ids"]
    assert trace["prompt_length"] == len(expected_ids)

    positions = trace["positions"][: len(expected_ids)]
    assert [p["token_id"] for p in positions] == expected_ids
    assert [p["token_text"] for p in positions] == [
        reference_tokenizer.decode([i]) for i in expected_ids
    ]
    raw = b"".join(base64.b64decode(p["token_bytes"], validate=True) for p in positions)
    assert raw == example.prompt.encode("utf-8")


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_continuation_is_16_greedy_steps_of_a_hugging_face_run(example, reference_run, reference_tokenizer):
    trace = read_example(example.id)
    expected_ids = reference_run(example)["token_ids"]

    assert len(trace["positions"]) == trace["prompt_length"] + STEPS
    assert [p["token_id"] for p in trace["positions"]] == expected_ids
    assert [p["token_text"] for p in trace["positions"]] == [
        reference_tokenizer.decode([i]) for i in expected_ids
    ]


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_each_position_carries_the_top_10_next_token_predictions(example, reference_run, reference_tokenizer):
    expected = reference_run(example)
    positions = read_example(example.id)["positions"]
    assert len(positions) == len(expected["top_ids"])

    for position, top_ids, top_probabilities in zip(
        positions, expected["top_ids"], expected["top_probabilities"]
    ):
        predictions = position["predictions"]
        assert [t["token_id"] for t in predictions["tokens"]] == top_ids
        assert [t["token_text"] for t in predictions["tokens"]] == [
            reference_tokenizer.decode([i]) for i in top_ids
        ]
        assert float32s(predictions["probabilities"]) == pytest.approx(
            top_probabilities, abs=PROBABILITY_TOLERANCE
        )


def test_there_are_two_examples_in_each_length_band():
    assert sorted(example.band for example in EXAMPLES) == sorted(
        ["short", "short", "medium", "medium", "long", "long"]
    )


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_example_satisfies_the_selection_rules(example):
    trace = read_example(example.id)
    p = trace["prompt_length"]
    lo, hi = PROMPT_LENGTH_BANDS[example.band]
    assert lo <= p <= hi, "Prompt length outside its band"

    continuation = trace["positions"][p:]
    ids = [position["token_id"] for position in continuation]
    trigrams = [tuple(ids[i : i + 3]) for i in range(len(ids) - 2)]
    assert len(set(trigrams)) == len(trigrams), "a token 3-gram repeats in the Continuation"

    # The predictions made at Positions p - 1 … p + 14 chose the 16 Continuation tokens.
    for step, position in enumerate(trace["positions"][p - 1 : p - 1 + STEPS], start=1):
        top1, top2 = float32s(position["predictions"]["probabilities"])[:2]
        assert top1 - top2 >= MIN_MARGIN, f"top-1 is not clear of top-2 at Step {step}"

    for position in continuation:
        assert set(position["token_text"]) != {"\n"}, "newline-only token in the Continuation"
    assert not example.prompt.rstrip().endswith("?"), "the Prompt is a question"


def test_some_example_has_a_word_split_into_several_tokens(reference_tokenizer):
    def split_words(example):
        ids = reference_tokenizer(example.prompt)["input_ids"]
        pieces = [reference_tokenizer.decode([i]) for i in ids]
        return [
            pieces[i - 1] + pieces[i]
            for i in range(1, len(pieces))
            if pieces[i][:1].isalpha() and pieces[i - 1][-1:].isalpha()
        ]

    assert any(split_words(example) for example in EXAMPLES)


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
