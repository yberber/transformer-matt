"""The committed contract schema must never drift from the Pydantic models."""

from inside_transformer.schema import SCHEMA_PATH, export_schema


def test_committed_schema_matches_the_pydantic_export():
    assert SCHEMA_PATH.read_text(encoding="utf-8") == export_schema(), (
        "contract/trace.schema.json is stale: run `uv run export-schema` "
        "and `npm run gen:types` in web/"
    )
