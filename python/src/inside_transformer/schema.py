"""Exports the Trace contract as JSON Schema. Run with `uv run export-schema`."""

import json
from pathlib import Path

from inside_transformer.trace import Trace

REPO_ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = REPO_ROOT / "contract" / "trace.schema.json"


def export_schema() -> str:
    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        **Trace.model_json_schema(mode="serialization"),
    }
    return json.dumps(schema, indent=2) + "\n"


def main() -> None:
    SCHEMA_PATH.write_text(export_schema(), encoding="utf-8")
    print(f"Wrote {SCHEMA_PATH}")
