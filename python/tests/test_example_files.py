"""Checks on the committed Example files, the seam between regeneration and the web app."""

import base64
import json
import struct

import brotli
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
# Float32 results differ in their last bits between CPUs (the committed files come
# from macOS arm64, CI runs Linux x86_64), so floats are compared within the
# spec's verification tolerances, never bit for bit.
PROBABILITY_TOLERANCE = 1e-4
EMBEDDING_TOLERANCE = 1e-6
# Not a spec tolerance, for norms and int8 scales: a norm sums 768 squares, whose
# rounding depends on the CPU, and a scale is a maximum divided by 127.
RELATIVE_TOLERANCE = 1e-5
N_EMBD = 768
N_LAYER = 12
N_HEAD = 12
INT8_MAX = 127
EXACT_DIMENSIONS = 16
# Attention weights travel as round(weight × 255), so half a step is 1/510 (the
# spec's tolerance); a weight on a rounding boundary may land on either side, and
# the CPU's last bits decide which.
ATTENTION_STEPS = 255
ATTENTION_TOLERANCE = 1 / (2 * ATTENTION_STEPS) + 1e-6
# The logit lens keeps this many tokens per layer.
LOGIT_LENS_TOKENS = 5

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
    # Eager attention, because the default SDPA kernel returns no attention weights.
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID, revision=MODEL_REVISION, dtype=torch.float32, attn_implementation="eager"
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
            probabilities = torch.softmax(logits, dim=-1)
            top = probabilities.topk(TOP_K, dim=-1)
            runs[example.id] = {
                "token_ids": token_ids,
                "probabilities": probabilities,
                "top_ids": top.indices.tolist(),
                "top_probabilities": top.values.tolist(),
            }
        return runs[example.id]

    return run


def float32s(encoded: str) -> list[float]:
    raw = base64.b64decode(encoded, validate=True)
    return list(struct.unpack(f"<{len(raw) // 4}f", raw))


def int8s(encoded: str) -> list[int]:
    raw = base64.b64decode(encoded, validate=True)
    return list(struct.unpack(f"<{len(raw)}b", raw))


def uint8s(encoded: str) -> list[int]:
    return list(base64.b64decode(encoded, validate=True))


def assert_same_top_tokens(actual_ids, actual_probabilities, expected_ids, expected_probabilities, probability_of):
    """The actual top tokens match the expected ones up to ties.

    Probabilities match rank by rank within the tolerance. Token IDs match rank by
    rank too, except that tokens whose probabilities lie within the tolerance of
    each other may swap places: such near-ties (some are below 1e-6) order
    differently on different CPUs. `probability_of(token_id)` is the expected
    side's probability of any token, or None when it is outside the expected top
    tokens, which a swapped-in token may only be if it ties with the cut-off.
    """
    assert len(actual_ids) == len(set(actual_ids)) == len(expected_ids)
    assert actual_probabilities == pytest.approx(expected_probabilities, abs=PROBABILITY_TOLERANCE)
    for rank, (actual, expected, probability) in enumerate(
        zip(actual_ids, expected_ids, actual_probabilities), start=1
    ):
        if actual == expected:
            continue
        expected_probability = probability_of(actual)
        if expected_probability is None:
            expected_probability = expected_probabilities[-1]
        assert abs(probability - expected_probability) <= PROBABILITY_TOLERANCE, (
            f"token {actual} at rank {rank} instead of {expected}, and not a near-tie"
        )


def assert_same_embedding(actual: dict, expected: dict) -> None:
    """Two embeddings agree within the verification tolerances; an int8 value may
    land one step away when its float sits on a rounding boundary."""
    assert actual.keys() == expected.keys() == {"values", "scale", "first_dimensions", "norm"}
    actual_values, expected_values = int8s(actual["values"]), int8s(expected["values"])
    assert len(actual_values) == len(expected_values)
    assert all(abs(a - e) <= 1 for a, e in zip(actual_values, expected_values))
    assert actual["scale"] == pytest.approx(expected["scale"], rel=RELATIVE_TOLERANCE)
    assert float32s(actual["first_dimensions"]) == pytest.approx(
        float32s(expected["first_dimensions"]), abs=EMBEDDING_TOLERANCE
    )
    assert actual["norm"] == pytest.approx(expected["norm"], rel=RELATIVE_TOLERANCE)


def assert_same_trace(actual: dict, expected: dict) -> None:
    """Two Traces agree: everything exact except floats, which match within the
    verification tolerances, and the order of near-tied predictions."""
    assert actual["header"] == expected["header"]
    assert actual["prompt_length"] == expected["prompt_length"]
    assert len(actual["positions"]) == len(expected["positions"])
    for actual_position, expected_position in zip(actual["positions"], expected["positions"]):
        assert actual_position.keys() == expected_position.keys() == {
            "token_id",
            "token_text",
            "token_bytes",
            "token_embedding",
            "position_embedding",
            "attention",
            "mlp_impact",
            "logit_lens",
            "predictions",
        }
        for field in ("token_id", "token_text", "token_bytes"):
            assert actual_position[field] == expected_position[field]
        for field in ("token_embedding", "position_embedding"):
            assert_same_embedding(actual_position[field], expected_position[field])
        # A weight on a rounding boundary may land one step away.
        actual_attention, expected_attention = uint8s(actual_position["attention"]), uint8s(expected_position["attention"])
        assert len(actual_attention) == len(expected_attention)
        assert all(abs(a - e) <= 1 for a, e in zip(actual_attention, expected_attention))

        assert float32s(actual_position["mlp_impact"]) == pytest.approx(
            float32s(expected_position["mlp_impact"]), rel=RELATIVE_TOLERANCE
        )
        assert len(actual_position["logit_lens"]) == len(expected_position["logit_lens"])
        for actual_top, expected_top in zip(actual_position["logit_lens"], expected_position["logit_lens"]):
            assert_same_wire_top_tokens(actual_top, expected_top)
        assert_same_wire_top_tokens(actual_position["predictions"], expected_position["predictions"])


def assert_same_wire_top_tokens(actual: dict, expected: dict) -> None:
    """Two top-token lists from Trace files agree up to near-ties."""
    actual_tokens, expected_tokens = actual["tokens"], expected["tokens"]
    expected_probabilities = float32s(expected["probabilities"])
    expected_by_id = dict(zip((t["token_id"] for t in expected_tokens), expected_probabilities))
    assert_same_top_tokens(
        [t["token_id"] for t in actual_tokens],
        float32s(actual["probabilities"]),
        [t["token_id"] for t in expected_tokens],
        expected_probabilities,
        expected_by_id.get,
    )
    # A token ID always comes with the same text and bytes.
    tokens_by_id = {t["token_id"]: t for t in expected_tokens}
    for token in actual_tokens:
        if token["token_id"] in tokens_by_id:
            assert token == tokens_by_id[token["token_id"]]


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

    for position, probabilities, top_ids, top_probabilities in zip(
        positions, expected["probabilities"], expected["top_ids"], expected["top_probabilities"]
    ):
        predictions = position["predictions"]
        ids = [t["token_id"] for t in predictions["tokens"]]
        assert_same_top_tokens(
            ids,
            float32s(predictions["probabilities"]),
            top_ids,
            top_probabilities,
            lambda token_id: float(probabilities[token_id]),
        )
        assert [t["token_text"] for t in predictions["tokens"]] == [
            reference_tokenizer.decode([i]) for i in ids
        ]


@pytest.fixture(scope="module")
def reference_embeddings(reference_run, reference_model):
    """Each Example's token embeddings, looked up through the model's input
    embedding layer, and what enters the first block (`hidden_states[0]`); the
    position embeddings are the difference."""
    embeddings = {}

    def run(example):
        if example.id not in embeddings:
            token_ids = torch.tensor([reference_run(example)["token_ids"]])
            with torch.no_grad():
                token = reference_model.get_input_embeddings()(token_ids)[0]
                block_input = reference_model(token_ids, output_hidden_states=True).hidden_states[0][0]
            embeddings[example.id] = {"token": token, "position": block_input - token, "sum": block_input}
        return embeddings[example.id]

    return run


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_the_first_16_embedding_dimensions_match_a_hugging_face_run(example, reference_embeddings):
    expected = reference_embeddings(example)
    positions = read_example(example.id)["positions"]
    assert len(positions) == len(expected["token"])

    for i, position in enumerate(positions):
        for kind in ("token", "position"):
            first = float32s(position[f"{kind}_embedding"]["first_dimensions"])
            assert first == pytest.approx(expected[kind][i, :EXACT_DIMENSIONS].tolist(), abs=EMBEDDING_TOLERANCE), (
                f"{kind} embedding at Position {i}"
            )


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_embedding_strips_and_norms_match_a_hugging_face_run(example, reference_embeddings):
    expected = reference_embeddings(example)
    positions = read_example(example.id)["positions"]

    for i, position in enumerate(positions):
        for kind in ("token", "position"):
            embedding = position[f"{kind}_embedding"]
            vector = expected[kind][i]
            values, scale = int8s(embedding["values"]), embedding["scale"]
            # The whole vector, to half a step of its own int8 scale, which spans the full int8 range.
            assert len(values) == N_EMBD
            assert max(abs(v) for v in values) == INT8_MAX
            assert scale == pytest.approx(float(vector.abs().max()) / INT8_MAX, rel=RELATIVE_TOLERANCE)
            assert [v * scale for v in values] == pytest.approx(vector.tolist(), abs=scale / 2 + EMBEDDING_TOLERANCE)
            assert embedding["norm"] == pytest.approx(float(vector.norm()), rel=RELATIVE_TOLERANCE)


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_token_and_position_embeddings_add_up_to_the_first_blocks_input(example, reference_embeddings):
    expected = reference_embeddings(example)["sum"]
    for i, position in enumerate(read_example(example.id)["positions"]):
        token = float32s(position["token_embedding"]["first_dimensions"])
        at_position = float32s(position["position_embedding"]["first_dimensions"])
        assert [a + b for a, b in zip(token, at_position)] == pytest.approx(
            expected[i, :EXACT_DIMENSIONS].tolist(), abs=EMBEDDING_TOLERANCE
        )


@pytest.fixture(scope="module")
def reference_attention(reference_run, reference_model):
    """Each Example's attention weights from one plain forward pass over the whole
    sequence: a tensor [layer, head, query Position, key Position]."""
    attention = {}

    def run(example):
        if example.id not in attention:
            token_ids = torch.tensor([reference_run(example)["token_ids"]])
            with torch.no_grad():
                layers = reference_model(token_ids, output_attentions=True).attentions
            attention[example.id] = torch.stack([layer[0] for layer in layers])
        return attention[example.id]

    return run


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_attention_rows_match_a_hugging_face_run(example, reference_attention):
    expected = reference_attention(example)
    positions = read_example(example.id)["positions"]
    assert expected.shape[:3] == (N_LAYER, N_HEAD, len(positions))

    for i, position in enumerate(positions):
        # Layer by layer, head by head: the weights from this Position to Positions 0 … i.
        weights = [value / ATTENTION_STEPS for value in uint8s(position["attention"])]
        assert weights == pytest.approx(
            expected[:, :, i, : i + 1].flatten().tolist(), abs=ATTENTION_TOLERANCE
        ), f"attention at Position {i}"


@pytest.fixture(scope="module")
def reference_layers(reference_run, reference_model):
    """Each Example's per-layer values from one plain forward pass over the whole
    sequence: the logit lens's probabilities [layer, Position, token], and the
    MLP output and the residual stream it is added to, [layer, Position, dimension]."""
    layers = {}

    def run(example):
        if example.id not in layers:
            token_ids = torch.tensor([reference_run(example)["token_ids"]])
            transformer = reference_model.transformer
            attention_outputs, mlp_outputs = [], []
            hooks = [
                hook
                for block in transformer.h
                for hook in (
                    block.attn.register_forward_hook(lambda _, __, output: attention_outputs.append(output[0][0])),
                    block.mlp.register_forward_hook(lambda _, __, output: mlp_outputs.append(output[0])),
                )
            ]
            try:
                with torch.no_grad():
                    hidden = reference_model(token_ids, output_hidden_states=True).hidden_states
                    # hidden_states[l] is the residual stream after block l; the last one
                    # has already been through the final LayerNorm, the others have not.
                    normed = [transformer.ln_f(h[0]) for h in hidden[1:-1]] + [hidden[-1][0]]
                    lens = torch.stack([torch.softmax(reference_model.lm_head(h), dim=-1) for h in normed])
            finally:
                for hook in hooks:
                    hook.remove()
            # The MLP's output is added to the residual stream as it leaves attention: the
            # block's input (hidden_states[l] before block l + 1) plus the attention output.
            block_inputs = torch.stack([h[0] for h in hidden[:-1]])
            layers[example.id] = {
                "logit_lens": lens,
                "residual": block_inputs + torch.stack(attention_outputs),
                "mlp_output": torch.stack(mlp_outputs),
            }
        return layers[example.id]

    return run


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_logit_lens_matches_a_hugging_face_run(example, reference_layers, reference_tokenizer):
    lens = reference_layers(example)["logit_lens"]
    positions = read_example(example.id)["positions"]
    assert lens.shape[:2] == (N_LAYER, len(positions))

    for i, position in enumerate(positions):
        assert len(position["logit_lens"]) == N_LAYER
        for layer, top_tokens in enumerate(position["logit_lens"]):
            probabilities = lens[layer, i]
            top = probabilities.topk(LOGIT_LENS_TOKENS)
            ids = [t["token_id"] for t in top_tokens["tokens"]]
            assert_same_top_tokens(
                ids,
                float32s(top_tokens["probabilities"]),
                top.indices.tolist(),
                top.values.tolist(),
                lambda token_id: float(probabilities[token_id]),
            )
            assert [t["token_text"] for t in top_tokens["tokens"]] == [
                reference_tokenizer.decode([token_id]) for token_id in ids
            ], f"logit lens at Position {i}, layer {layer + 1}"


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_logit_lens_at_the_last_layer_is_the_prediction(example):
    for position in read_example(example.id)["positions"]:
        last = position["logit_lens"][-1]
        predictions = position["predictions"]
        assert last["tokens"] == predictions["tokens"][:LOGIT_LENS_TOKENS]
        assert float32s(last["probabilities"]) == pytest.approx(
            float32s(predictions["probabilities"])[:LOGIT_LENS_TOKENS], abs=PROBABILITY_TOLERANCE
        )


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_mlp_impact_matches_a_hugging_face_run(example, reference_layers):
    expected = reference_layers(example)
    impact = expected["mlp_output"].norm(dim=-1) / expected["residual"].norm(dim=-1)
    positions = read_example(example.id)["positions"]
    assert impact.shape == (N_LAYER, len(positions))

    for i, position in enumerate(positions):
        # Layer by layer: the norm of the MLP's output over the norm of the residual stream it is added to.
        assert float32s(position["mlp_impact"]) == pytest.approx(
            impact[:, i].tolist(), rel=RELATIVE_TOLERANCE
        ), f"MLP impact at Position {i}"


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


def test_regenerating_reproduces_the_committed_files(tmp_path):
    write_data(tmp_path)

    def snapshot(root):
        return {p.relative_to(root): p.read_bytes() for p in sorted(root.rglob("*")) if p.is_file()}

    regenerated, committed = snapshot(tmp_path), snapshot(DATA_DIR)
    assert regenerated.keys() == committed.keys()
    for path, content in committed.items():
        if path.name.endswith(".json.br"):
            # The brotli file is exactly the readable file, compressed.
            assert brotli.decompress(content) == committed[path.with_suffix("")], path
        elif path.parent.name == "examples":
            assert_same_trace(json.loads(regenerated[path]), json.loads(content))
        else:
            assert regenerated[path] == content, path


@pytest.mark.parametrize("example", EXAMPLES, ids=lambda e: e.id)
def test_example_file_is_under_300_kb_brotli_compressed(example):
    assert (EXAMPLES_DIR / f"{example.id}.json.br").stat().st_size < 300_000
