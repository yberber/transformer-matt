"""The inference server's per-client rate limits, kept in memory: 120 tokenize calls
and 60 Step requests a minute, and at most 2 requests in flight. Over a limit the
server answers 429 with Retry-After."""

import json
import socket
import threading

import httpx
import pytest
from fastapi.testclient import TestClient

from server import create_app
from test_server import assert_valid, serving, wait_until_ready

TOKENIZE = ("/tokenize", {"prompt": "Hello"})
STEP = ("/step", {"prompt": "Hello", "advance": 0})


class Clock:
    """A monotonic clock the test moves by hand."""

    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def client(clock):
    with TestClient(create_app(clock=clock)) as client:
        assert wait_until_ready(client).status_code == 200
        yield client


def assert_rate_limited(response, retry_after: int) -> None:
    assert response.status_code == 429
    assert assert_valid(response, "Error")["code"] == "rate_limited"
    assert response.headers["retry-after"] == str(retry_after)


def test_the_121st_tokenize_call_in_a_minute_is_rate_limited_until_the_first_is_a_minute_old(client, clock):
    path, body = TOKENIZE
    for _ in range(120):
        assert client.post(path, json=body).status_code == 200

    clock.advance(20)
    assert_rate_limited(client.post(path, json=body), retry_after=40)

    clock.advance(40)
    assert client.post(path, json=body).status_code == 200


def test_a_multi_step_request_counts_once_against_60_step_requests_a_minute(client, clock):
    path, body = STEP
    # A shared Live link's restore: several Steps in one request.
    response = client.post(path, json={"prompt": "Hello", "advance": 5})
    assert response.status_code == 200
    assert len(response.json()["positions"]) == 6
    for _ in range(59):
        clock.advance(0.5)
        assert client.post(path, json=body).status_code == 200

    assert_rate_limited(client.post(path, json=body), retry_after=31)
    # Tokenize calls are counted apart from Step requests.
    assert client.post("/tokenize", json=TOKENIZE[1]).status_code == 200

    clock.advance(31)
    assert client.post(path, json=body).status_code == 200


class HeldRequest:
    """A request whose headers are sent but whose body is held back, so that it stays
    in flight. It asks for "100 Continue", which the server sends once it has admitted
    the request and starts reading the body."""

    def __init__(self, port: int, path: str, body: dict):
        self.body = json.dumps(body).encode()
        self.connection = socket.create_connection(("127.0.0.1", port), timeout=10)
        self.connection.sendall(
            f"POST {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\n"
            f"Content-Length: {len(self.body)}\r\nExpect: 100-continue\r\n\r\n".encode()
        )
        assert self.connection.recv(1024).startswith(b"HTTP/1.1 100 Continue")

    def finish(self) -> bytes:
        """Sends the body and returns the status line of the response."""
        self.connection.sendall(self.body)
        return self.connection.makefile("rb").readline().rstrip()

    def close(self) -> None:
        self.connection.close()


def test_a_third_request_in_flight_is_rate_limited_until_one_finishes():
    # No model is needed: a request is admitted or refused before its body is read.
    with serving(create_app(load_model=threading.Event().wait)) as port:
        held = [HeldRequest(port, *STEP), HeldRequest(port, *TOKENIZE)]
        try:
            with httpx.Client(base_url=f"http://127.0.0.1:{port}") as http:
                for path, body in (TOKENIZE, STEP):
                    assert_rate_limited(http.post(path, json=body), retry_after=1)

                assert held[0].finish() == b"HTTP/1.1 503 Service Unavailable"
                response = http.post(STEP[0], json=STEP[1])
                assert assert_valid(response, "Error")["code"] == "model_loading"
        finally:
            for request in held:
                request.close()


PROXY = "10.0.0.2"


def forwarded_tokenize(client: TestClient, client_ip: str):
    return client.post(TOKENIZE[0], json=TOKENIZE[1], headers={"X-Forwarded-For": client_ip})


def test_a_trusted_proxy_forwards_each_client_ip_so_their_requests_count_apart(clock):
    # Without its lifespan the app never loads the model, so these are counted 503s.
    proxy = TestClient(create_app(clock=clock, trusted_proxies=PROXY), client=(PROXY, 50000))
    for _ in range(120):
        assert forwarded_tokenize(proxy, "198.51.100.1").status_code == 503

    assert_rate_limited(forwarded_tokenize(proxy, "198.51.100.1"), retry_after=60)
    assert forwarded_tokenize(proxy, "198.51.100.2").status_code == 503


def test_a_forwarded_header_from_an_untrusted_address_is_ignored(clock):
    untrusted = TestClient(create_app(clock=clock, trusted_proxies=PROXY), client=("203.0.113.9", 50000))
    for i in range(120):
        assert forwarded_tokenize(untrusted, f"198.51.100.{i}").status_code == 503

    assert_rate_limited(forwarded_tokenize(untrusted, "198.51.100.200"), retry_after=60)
