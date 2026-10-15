"""Per-client rate limits, kept in memory only: a client's counts are dropped within
two minutes of its last request, and nothing is persisted."""

import math
import threading
from collections import deque
from collections.abc import Callable, Mapping

# Each limit counts the requests of the last minute.
WINDOW_SECONDS = 60.0
# A client refused for having too many requests in flight may retry after this many seconds.
IN_FLIGHT_RETRY_AFTER = 1


class RateLimited(Exception):
    def __init__(self, retry_after: int):
        super().__init__(f"Rate limited; retry after {retry_after} s.")
        self.retry_after = retry_after


class RateLimiter:
    """Admits a client's request if the client is under every limit, and counts it.

    `per_minute` maps each limited kind of request to how many a client may make a
    minute, and `in_flight` is how many of its requests may run at once; `clock` is a
    monotonic clock in seconds."""

    def __init__(self, per_minute: Mapping[str, int], in_flight: int, clock: Callable[[], float]):
        self._per_minute = per_minute
        self._max_in_flight = in_flight
        self._clock = clock
        self._lock = threading.Lock()
        # When each client's admitted requests of each kind arrived, oldest first.
        self._arrivals: dict[tuple[str, str], deque[float]] = {}
        self._last_sweep = clock()
        # How many of each client's requests are running; a client with none has no entry.
        self._in_flight: dict[str, int] = {}

    def admit(self, client: str, kind: str) -> Callable[[], None]:
        """Counts the request and returns the function to call once it has finished, or
        raises RateLimited with the whole seconds until it would be admitted."""
        with self._lock:
            now = self._clock()
            if now - self._last_sweep >= WINDOW_SECONDS:
                self._sweep(now)
            arrivals = self._arrivals.setdefault((client, kind), deque())
            while arrivals and arrivals[0] <= now - WINDOW_SECONDS:
                arrivals.popleft()
            if len(arrivals) >= self._per_minute[kind]:
                raise RateLimited(max(1, math.ceil(arrivals[0] + WINDOW_SECONDS - now)))
            if self._in_flight.get(client, 0) >= self._max_in_flight:
                raise RateLimited(IN_FLIGHT_RETRY_AFTER)
            arrivals.append(now)
            self._in_flight[client] = self._in_flight.get(client, 0) + 1
        return lambda: self._finished(client)

    def _sweep(self, now: float) -> None:
        """Forgets the clients whose last request is over a minute old."""
        self._arrivals = {
            key: arrivals
            for key, arrivals in self._arrivals.items()
            if arrivals and arrivals[-1] > now - WINDOW_SECONDS
        }
        self._last_sweep = now

    def _finished(self, client: str) -> None:
        with self._lock:
            self._in_flight[client] -= 1
            if not self._in_flight[client]:
                del self._in_flight[client]
