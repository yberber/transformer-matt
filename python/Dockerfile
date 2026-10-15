# The inference server, with the pinned GPT-2 model baked in. compose.yaml builds it
# for linux/arm64 (an Oracle Cloud Ampere A1 VM).
FROM ghcr.io/astral-sh/uv:0.12.10-python3.12-trixie-slim

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=0
WORKDIR /app

# Dependencies first, so that a code change does not reinstall torch.
COPY pyproject.toml uv.lock .python-version ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev --no-install-project
COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev

RUN useradd --system --create-home app && install -d -o app /opt/huggingface
USER app
ENV HF_HOME=/opt/huggingface PATH=/app/.venv/bin:$PATH

# Loads the tokenizer, model and config at the pinned revision, as the server does at
# startup, so the image holds every file the server needs; then it never goes online.
RUN python -c "import inside_transformer; inside_transformer.load()"
ENV HF_HUB_OFFLINE=1 HOST=0.0.0.0 PORT=8000

EXPOSE 8000
CMD ["serve"]
