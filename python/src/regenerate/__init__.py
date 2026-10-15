"""Regenerates every Example file, and the pinned model config, into the web app's data.

Run with `uv run regenerate`. Output must be byte-identical across runs.
"""

import shutil
from dataclasses import dataclass
from pathlib import Path

import brotli
from huggingface_hub import hf_hub_download

from inside_transformer import MODEL_ID, MODEL_REVISION, build_trace
from inside_transformer.schema import REPO_ROOT

DATA_DIR = REPO_ROOT / "web" / "public" / "data"
EXAMPLES_SUBDIR = "examples"
EXAMPLES_DIR = DATA_DIR / EXAMPLES_SUBDIR
MODEL_CONFIG_FILE = "gpt2-config.json"


@dataclass(frozen=True)
class Example:
    id: str
    prompt: str


# A placeholder until the six selected Examples land. It exercises every token
# rendering case: leading spaces, a word split into pieces, a character split
# across tokens, a newline and a tab.
EXAMPLES = [
    Example(
        id="placeholder",
        prompt="Tokenizers split words like ☕ into pieces.\n\tEven tabs and newlines",
    ),
]


def write_data(data_dir: Path) -> None:
    examples_dir = data_dir / EXAMPLES_SUBDIR
    examples_dir.mkdir(parents=True, exist_ok=True)
    for example in EXAMPLES:
        readable = (build_trace(example.prompt).model_dump_json(indent=2) + "\n").encode("utf-8")
        (examples_dir / f"{example.id}.json").write_bytes(readable)
        (examples_dir / f"{example.id}.json.br").write_bytes(
            brotli.compress(readable, mode=brotli.MODE_TEXT, quality=11)
        )
    config = hf_hub_download(MODEL_ID, "config.json", revision=MODEL_REVISION)
    shutil.copyfile(config, data_dir / MODEL_CONFIG_FILE)


def main() -> None:
    write_data(DATA_DIR)
    print(f"Wrote {len(EXAMPLES)} Example(s) and {MODEL_CONFIG_FILE} to {DATA_DIR}")
