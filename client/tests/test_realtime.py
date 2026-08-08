"""I/O matrix tests for the reconnecting WebSocket client (Story 2.1, AC1/AC3).

Uses a local, in-process fake WS server (`websockets.serve` on an ephemeral
port) since the Client already depends on the `websockets` package - no
second test-only dependency needed. No real network or server involved.
"""

import asyncio
import http
import time

import websockets

from agent.realtime import connect_and_run


async def _run_with_timeout(coro, *, timeout: float):
    """Fail loudly instead of hanging the suite if `connect_and_run` misbehaves."""
    await asyncio.wait_for(coro, timeout=timeout)


def test_sends_heartbeat_messages_periodically() -> None:
    received: list[str] = []

    async def handler(connection) -> None:
        async for message in connection:
            received.append(message)

    async def scenario() -> None:
        async with websockets.serve(handler, "localhost", 0) as server:
            port = server.sockets[0].getsockname()[1]
            stop_event = asyncio.Event()

            async def stopper() -> None:
                await asyncio.sleep(0.35)
                stop_event.set()

            asyncio.create_task(stopper())
            await connect_and_run(
                f"ws://localhost:{port}",
                "test-token",
                heartbeat_interval=0.05,
                stop_event=stop_event,
            )

    asyncio.run(_run_with_timeout(scenario(), timeout=5.0))

    assert len(received) >= 3
    assert all(message == '{"type": "heartbeat"}' for message in received)


def test_reconnects_after_rejected_connections_with_growing_backoff(monkeypatch) -> None:
    # Full jitter draws from Uniform(0, backoff). Patch out the randomness so
    # the observed gaps deterministically reflect the backoff schedule
    # itself (1s, then 2s) instead of comparing two independent random
    # samples against each other - asserting on raw jittered samples has a
    # real spurious-failure rate, exactly what the spec's own phrasing
    # ("assert e.g. the second observed gap's upper bound exceeds the
    # first's") was steering away from.
    monkeypatch.setattr("agent.realtime.random.uniform", lambda _lo, hi: hi)

    attempt_times: list[float] = []

    async def process_request(connection, request):
        attempt_times.append(time.monotonic())
        if len(attempt_times) <= 2:
            return connection.respond(http.HTTPStatus.SERVICE_UNAVAILABLE, "rejected\n")
        return None

    async def handler(connection) -> None:
        async for _ in connection:
            pass

    async def scenario() -> None:
        async with websockets.serve(
            handler, "localhost", 0, process_request=process_request
        ) as server:
            port = server.sockets[0].getsockname()[1]
            stop_event = asyncio.Event()

            async def stopper() -> None:
                await asyncio.sleep(6.0)
                stop_event.set()

            asyncio.create_task(stopper())
            await connect_and_run(
                f"ws://localhost:{port}",
                "test-token",
                heartbeat_interval=0.05,
                stop_event=stop_event,
            )

    asyncio.run(_run_with_timeout(scenario(), timeout=10.0))

    assert len(attempt_times) >= 3
    gaps = [attempt_times[i + 1] - attempt_times[i] for i in range(len(attempt_times) - 1)]
    # Jitter is randomized, so assert growth in the upper bound (backoff
    # doubling each failed attempt), not an exact value.
    assert gaps[1] > gaps[0]


def test_reconnects_after_server_closes_connection_mid_run(monkeypatch) -> None:
    # Same determinism fix as the backoff-growth test above: full jitter on
    # the first reconnect draws from Uniform(0, 1.0s), which can exceed this
    # test's 0.5s stop window often enough to flake (~50% of the time) -
    # observed directly while re-verifying this suite after unrelated
    # changes, pre-dating and unrelated to this diff's own review findings.
    monkeypatch.setattr("agent.realtime.random.uniform", lambda _lo, hi: hi / 10)

    connection_count = 0
    second_connection_received: list[str] = []

    async def handler(connection) -> None:
        nonlocal connection_count
        connection_count += 1
        if connection_count == 1:
            await connection.close()
            return
        async for message in connection:
            second_connection_received.append(message)

    async def scenario() -> None:
        async with websockets.serve(handler, "localhost", 0) as server:
            port = server.sockets[0].getsockname()[1]
            stop_event = asyncio.Event()

            async def stopper() -> None:
                await asyncio.sleep(0.5)
                stop_event.set()

            asyncio.create_task(stopper())
            await connect_and_run(
                f"ws://localhost:{port}",
                "test-token",
                heartbeat_interval=0.05,
                stop_event=stop_event,
            )

    asyncio.run(_run_with_timeout(scenario(), timeout=5.0))

    assert connection_count >= 2
    assert len(second_connection_received) >= 1


def test_stop_event_exits_cleanly_within_bounded_time() -> None:
    async def handler(connection) -> None:
        async for _ in connection:
            pass

    async def scenario() -> None:
        async with websockets.serve(handler, "localhost", 0) as server:
            port = server.sockets[0].getsockname()[1]
            stop_event = asyncio.Event()

            async def stopper() -> None:
                await asyncio.sleep(0.1)
                stop_event.set()

            asyncio.create_task(stopper())
            await connect_and_run(
                f"ws://localhost:{port}",
                "test-token",
                heartbeat_interval=10.0,
                stop_event=stop_event,
            )

    # A test that can hang the suite on failure is worse than one that just
    # fails - bound it explicitly rather than trusting the implementation.
    started = time.monotonic()
    asyncio.run(_run_with_timeout(scenario(), timeout=2.0))
    assert time.monotonic() - started < 2.0


def test_does_not_retry_after_fatal_close_code() -> None:
    """The Backend's `/ws` route accepts before closing with 4401/4403 on
    rejection (router.py's docstring) - `connect_and_run` should give up
    rather than backing off and retrying against a rejection that will
    never resolve on its own."""
    connection_count = 0

    async def handler(connection) -> None:
        nonlocal connection_count
        connection_count += 1
        await connection.close(code=4401)

    async def scenario() -> None:
        async with websockets.serve(handler, "localhost", 0) as server:
            port = server.sockets[0].getsockname()[1]
            # No stopper: if `connect_and_run` doesn't give up on its own,
            # this hangs until the outer timeout fails the test loudly.
            await connect_and_run(
                f"ws://localhost:{port}",
                "test-token",
                heartbeat_interval=0.05,
            )

    asyncio.run(_run_with_timeout(scenario(), timeout=5.0))

    assert connection_count == 1
