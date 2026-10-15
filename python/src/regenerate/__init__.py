"""Regenerates every Example file, and the pinned model config, into the web app's data.

Run with `uv run regenerate`. Output is byte-identical across runs on one machine;
across CPUs, float32 values may differ in their last bits (pytest allows for that).
"""

import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import brotli
from huggingface_hub import hf_hub_download

from inside_transformer import MODEL_ID, MODEL_REVISION, build_trace
from inside_transformer.schema import REPO_ROOT

DATA_DIR = REPO_ROOT / "web" / "public" / "data"
EXAMPLES_SUBDIR = "examples"
EXAMPLES_DIR = DATA_DIR / EXAMPLES_SUBDIR
MODEL_CONFIG_FILE = "gpt2-config.json"
# Every Example ships with this many precomputed Steps.
STEPS = 16


@dataclass(frozen=True)
class Example:
    id: str
    band: Literal["short", "medium", "long"]
    prompt: str


# The six Examples, as selected from the drafted candidates by `uv run select-examples`.
EXAMPLES = [
    Example(id="baker", band="short", prompt="The baker woke up early every morning to"),
    Example(id="village", band="short", prompt="Once upon a time, in a small village by the sea"),
    Example(
        id="buttons",
        band="medium",
        prompt="My grandmother kept a jar of buttons on the kitchen shelf, and every Sunday she "
        "would let me pour them out onto the table and",
    ),
    Example(
        id="einstein",
        band="medium",
        prompt="Albert Einstein was a German-born theoretical physicist who developed the theory "
        "of relativity, one of the two pillars of modern",
    ),
    Example(
        id="stray-dog",
        band="long",
        prompt="It had been raining for three days when the stray dog first appeared at our door. "
        "My little brother wanted to keep him, but my mother said we could not afford another "
        "mouth to feed. That night, I crept downstairs and",
    ),
    Example(
        id="moon",
        band="long",
        prompt="The Moon is slowly drifting away from the Earth, by about 3.8 centimetres every "
        "year. Scientists measure this distance by bouncing laser beams off mirrors that "
        "astronauts left on the Moon. Over billions of years, this drift will",
    ),
]


def write_data(data_dir: Path) -> None:
    examples_dir = data_dir / EXAMPLES_SUBDIR
    examples_dir.mkdir(parents=True, exist_ok=True)
    for example in EXAMPLES:
        readable = (build_trace(example.prompt, STEPS).model_dump_json(indent=2) + "\n").encode("utf-8")
        (examples_dir / f"{example.id}.json").write_bytes(readable)
        (examples_dir / f"{example.id}.json.br").write_bytes(
            brotli.compress(readable, mode=brotli.MODE_TEXT, quality=11)
        )
    config = hf_hub_download(MODEL_ID, "config.json", revision=MODEL_REVISION)
    shutil.copyfile(config, data_dir / MODEL_CONFIG_FILE)


def main() -> None:
    write_data(DATA_DIR)
    print(f"Wrote {len(EXAMPLES)} Example(s) and {MODEL_CONFIG_FILE} to {DATA_DIR}")
