"""The inference server: Live mode's HTTP API over the Python core.

Run with `uv run serve`. One uvicorn worker process; forward passes run in a
thread pool, and torch's thread count is set from the core count.
"""

import asyncio
import copy
import logging
import os
import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

import torch
import uvicorn
from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

import inside_transformer
from inside_transformer.api import (
    MAX_CONTINUATION_TOKENS,
    MAX_PROMPT_CHARACTERS,
    MAX_PROMPT_TOKENS,
    Error,
    ErrorCode,
    Health,
    PromptStepRequest,
    StepRequest,
    StepResponse,
    TokenizeRequest,
    TokenizeResponse,
)

logger = logging.getLogger(__name__)

# Forward passes run in a thread pool of this many threads, which share the CPU cores.
FORWARD_PASS_THREADS = 2
# The HTTP status of each error code.
ERROR_STATUS: dict[ErrorCode, int] = {
    "prompt_too_long": 422,
    "continuation_too_long": 422,
    "empty_prompt": 422,
    "invalid_request": 422,
    "model_loading": 503,
    "not_found": 404,
    "method_not_allowed": 405,
}
HTTP_ERROR_CODES: dict[int, ErrorCode] = {404: "not_found", 405: "method_not_allowed"}
ERROR_RESPONSES = {422: {"model": Error}, 503: {"model": Error}}


class ApiError(Exception):
    def __init__(self, code: ErrorCode, message: str):
        super().__init__(message)
        self.error = Error(code=code, message=message)


def _error_response(error: Error) -> JSONResponse:
    return JSONResponse(error.model_dump(), status_code=ERROR_STATUS[error.code])


def _check_prompt_characters(prompt: str) -> None:
    if len(prompt) > MAX_PROMPT_CHARACTERS:
        raise ApiError("prompt_too_long", f"The Prompt has more than {MAX_PROMPT_TOKENS} tokens.")


def _step(request: StepRequest) -> StepResponse:
    """Checks the request against the limits, then runs it. Runs in the forward-pass pool."""
    if isinstance(request, PromptStepRequest):
        _check_prompt_characters(request.prompt)
        token_ids = inside_transformer.token_ids(request.prompt)
        prompt_length, first_position = len(token_ids), 0
    else:
        token_ids, prompt_length, first_position = request.token_ids, request.prompt_length, len(request.token_ids)
        if prompt_length > len(token_ids):
            raise ApiError("invalid_request", "prompt_length is longer than token_ids.")
    if prompt_length == 0:
        raise ApiError("empty_prompt", "The Prompt has no tokens.")
    if prompt_length > MAX_PROMPT_TOKENS:
        raise ApiError("prompt_too_long", f"The Prompt has {prompt_length} tokens; the limit is {MAX_PROMPT_TOKENS}.")
    continuation = len(token_ids) - prompt_length + request.advance
    if continuation > MAX_CONTINUATION_TOKENS:
        raise ApiError(
            "continuation_too_long",
            f"The Continuation would have {continuation} tokens; the limit is {MAX_CONTINUATION_TOKENS}.",
        )
    return StepResponse(
        header=inside_transformer.header(),
        prompt_length=prompt_length,
        first_position=first_position,
        positions=inside_transformer.advance(token_ids, request.advance, record_from=first_position),
    )


def _torch_threads() -> int:
    """The cores this process may use, shared between the forward-pass threads."""
    cores = len(os.sched_getaffinity(0)) if hasattr(os, "sched_getaffinity") else os.cpu_count() or 1
    return max(1, cores // FORWARD_PASS_THREADS)


def create_app(load_model: Callable[[], None] = inside_transformer.load) -> FastAPI:
    """The app; `load_model` loads the model in the background while Health reports 503."""
    loaded = threading.Event()

    def load() -> None:
        load_model()
        loaded.set()
        logger.info("Model loaded")

    forward_passes = ThreadPoolExecutor(FORWARD_PASS_THREADS, thread_name_prefix="forward-pass")

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        torch.set_num_threads(_torch_threads())
        # A daemon thread, so that shutting down never waits for a load in progress.
        threading.Thread(target=load, name="load-model", daemon=True).start()
        yield
        forward_passes.shutdown(wait=False, cancel_futures=True)

    def model_ready() -> None:
        if not loaded.is_set():
            raise ApiError("model_loading", "The model is still loading.")

    app = FastAPI(title="Inside the Transformer", lifespan=lifespan)

    @app.exception_handler(ApiError)
    async def api_error(_: Request, error: ApiError):
        return _error_response(error.error)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_: Request, error: RequestValidationError):
        # Each error's location and message only: its `input` would echo the Prompt.
        problems = "; ".join(
            f"{'.'.join(str(part) for part in problem['loc'])}: {problem['msg']}" for problem in error.errors()
        )
        return _error_response(Error(code="invalid_request", message=problems))

    @app.exception_handler(HTTPException)
    async def http_error(_: Request, error: HTTPException):
        code = HTTP_ERROR_CODES.get(error.status_code, "invalid_request")
        return _error_response(Error(code=code, message=str(error.detail)))

    @app.get("/health", response_model=Health, responses={503: {"model": Health}})
    def health():
        if not loaded.is_set():
            return JSONResponse(Health(status="loading").model_dump(), status_code=503)
        return Health(status="ready")

    @app.post(
        "/tokenize", response_model=TokenizeResponse, responses=ERROR_RESPONSES, dependencies=[Depends(model_ready)]
    )
    def tokenize(request: TokenizeRequest):
        _check_prompt_characters(request.prompt)
        tokens = inside_transformer.tokenize(request.prompt)
        return TokenizeResponse(tokens=tokens, count=len(tokens))

    @app.post(
        "/step", response_model=StepResponse, responses=ERROR_RESPONSES, dependencies=[Depends(model_ready)]
    )
    async def step(request: StepRequest):
        # One request holds one forward-pass thread until all its Steps are done.
        return await asyncio.get_running_loop().run_in_executor(forward_passes, _step, request)

    return app


def uvicorn_config(app: FastAPI, host: str, port: int) -> uvicorn.Config:
    """One worker process, and no access log: Prompt text must never reach a log, and
    the reverse proxy keeps the access log (method, path without query, status, timing)."""
    log_config = copy.deepcopy(uvicorn.config.LOGGING_CONFIG)
    log_config["loggers"][__name__] = {"handlers": ["default"], "level": "INFO", "propagate": False}
    return uvicorn.Config(app, host=host, port=port, workers=1, access_log=False, log_config=log_config)


def main() -> None:
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.Server(uvicorn_config(create_app(), host, port)).run()
