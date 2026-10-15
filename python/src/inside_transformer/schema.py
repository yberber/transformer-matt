"""Exports the contract as JSON Schema: the Trace, and the inference server's
requests and responses. Run with `uv run export-schema`."""

import json
from pathlib import Path

from pydantic.json_schema import models_json_schema

from inside_transformer.api import API_MODELS
from inside_transformer.trace import Trace

REPO_ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = REPO_ROOT / "contract" / "trace.schema.json"
API_SCHEMA_PATH = REPO_ROOT / "contract" / "api.schema.json"
JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema"


def export_schema() -> str:
    schema = {
        "$schema": JSON_SCHEMA_DIALECT,
        **Trace.model_json_schema(mode="serialization"),
    }
    return json.dumps(schema, indent=2) + "\n"


def export_api_schema() -> str:
    """Every request and response model under `$defs`, by its class name."""
    _, definitions = models_json_schema(
        [(model, "serialization") for model in API_MODELS], title="Inside the Transformer API"
    )
    return json.dumps({"$schema": JSON_SCHEMA_DIALECT, **definitions}, indent=2) + "\n"


def main() -> None:
    SCHEMA_PATH.write_text(export_schema(), encoding="utf-8")
    API_SCHEMA_PATH.write_text(export_api_schema(), encoding="utf-8")
    print(f"Wrote {SCHEMA_PATH} and {API_SCHEMA_PATH}")
