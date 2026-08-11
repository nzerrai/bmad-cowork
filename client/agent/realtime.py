"""Reconnecting WebSocket client for the Backend's `/ws` endpoint (Story 2.1).

Wired into the persistent agent run loop to report local Git state and
heartbeat over the WebSocket connection.
"""

import asyncio
import json
import logging
import random

import websockets
from websockets.exceptions import ConnectionClosedError, InvalidStatus

from .git_state import scan_repository

logger = logging.getLogger(__name__)

_BASE_BACKOFF_SECONDS = 1.0
_BACKOFF_FACTOR = 2.0
_MAX_BACKOFF_SECONDS = 30.0

# The Backend's `/ws` route accepts the connection, then closes with WS code
# 4401 (unauthorized) or 4403 (forbidden origin) on rejection - a real
# client sees a normal post-open close frame carrying that code, which
# `websockets` surfaces as `ConnectionClosedError.code`. `InvalidStatus`
# (rejection during the opening handshake itself, e.g. from a reverse proxy
# in front of the Backend) is handled the same way as a defensive fallback,
# even though `/ws` itself no longer produces it for auth/origin failures.
_FATAL_CLOSE_CODES = {4401, 4403}
_FATAL_HANDSHAKE_STATUS_CODES = {401, 403}


def _fatal_reason(exc: BaseException) -> int | None:
    """Returns the fatal code/status found on `exc`, or `None` if `exc`
    isn't a rejection this client should give up retrying on."""
    if isinstance(exc, ConnectionClosedError) and exc.rcvd is not None:
        code = exc.rcvd.code
        if code in _FATAL_CLOSE_CODES:
            return code
    if (
        isinstance(exc, InvalidStatus)
        and exc.response.status_code in _FATAL_HANDSHAKE_STATUS_CODES
    ):
        return exc.response.status_code
    return None


class _StopRequested(Exception):
    """Internal signal: unwinds the connection's TaskGroup when `stop_event` fires."""


async def _send_heartbeats(connection: websockets.ClientConnection, interval: float) -> None:
    logger.debug("Starting heartbeat sender with interval: %s seconds", interval)
    while True:
        logger.debug("Sending heartbeat to HUB")
        await connection.send(json.dumps({"type": "heartbeat"}))
        logger.debug("Heartbeat sent successfully")
        await asyncio.sleep(interval)


async def _receive_messages(connection: websockets.ClientConnection) -> None:
    """Drain/log incoming messages and handle space_joined responses.

    Processes incoming messages from the Backend. Handles the space_joined
    response from the client_identity_report flow and stores the space
    information locally for the Client's subsequent operations.
    """
    # Store space information locally
    _space_info = None

    logger.debug("Starting message receiver from HUB")
    async for message in connection:
        try:
            logger.debug("Received raw message from HUB: %s", message)
            data = json.loads(message)
            msg_type = data.get("type")

            if msg_type == "space_joined":
                _space_info = data
                logger.info("[HUB] Space joined received: space_id=%s, technical_identifier=%s, short_name=%s, status=%s",
                           data.get("space_id"), data.get("technical_identifier"),
                           data.get("short_name"), data.get("status"))
                logger.debug("Space information stored locally: %s", _space_info)
            elif msg_type == "client_git_state_report":
                logger.debug("[HUB] Received client_git_state_report: %s", data)
            elif msg_type == "heartbeat":
                logger.debug("[HUB] Received heartbeat response")
            else:
                logger.debug("[HUB] Received message of type '%s': %s", msg_type, data)
        except json.JSONDecodeError:
            logger.debug("Received non-JSON message from HUB: %s", message)
        except Exception:  # noqa: BLE001
            logger.warning("Error processing incoming message from HUB: %s", message)


async def _watch_stop(stop_event: asyncio.Event) -> None:
    await stop_event.wait()
    raise _StopRequested


async def _sleep_or_stop(delay: float, stop_event: asyncio.Event) -> None:
    """Sleep up to `delay` seconds, waking early if `stop_event` fires."""
    try:
        await asyncio.wait_for(stop_event.wait(), timeout=delay)
    except TimeoutError:
        pass


async def _send_git_state_report(connection: websockets.ClientConnection, repo_path: str = ".") -> None:
    """Send a Git state report over the WebSocket connection.

    Sends state reports over the existing WebSocket connection using the
    envelope format: `{"type": "client_git_state_report", "technical_identifier": <str>, "branch": <str>, "ahead": <int>, "behind": <int>, "in_progress_action": <str>, "is_bmad_enabled": <bool>}`

    Args:
        connection: The WebSocket connection.
        repo_path: Path to the Git repository to scan.
    """
    logger.debug("Scanning repository for Git state report: repo_path=%s", repo_path)
    state = scan_repository(repo_path)
    logger.debug("Repository scan completed: %s", state)

    report = {
        "type": "client_git_state_report",
        "technical_identifier": state.get("technical_identifier"),
        "branch": state.get("branch"),
        "ahead": state.get("ahead", 0),
        "behind": state.get("behind", 0),
        "in_progress_action": state.get("in_progress_action", "none"),
        "is_bmad_enabled": state.get("is_bmad_enabled", False),
    }
    try:
        logger.debug("Sending client_git_state_report to HUB: %s", report)
        await connection.send(json.dumps(report))
        logger.debug("client_git_state_report sent successfully to HUB")
    except Exception:  # noqa: BLE001
        logger.warning("Failed to send client_git_state_report to HUB")


async def _send_client_identity_report(connection: websockets.ClientConnection, repo_path: str = ".") -> None:
    """Send a client identity report over the WebSocket connection.

    Sends identity report over the existing WebSocket connection using the
    envelope format: `{"type": "client_identity_report", "technical_identifier": <remote_identity>}`

    Args:
        connection: The WebSocket connection.
        repo_path: Path to the Git repository to scan.
    """
    logger.debug("Starting client identity report process for repository: repo_path=%s", repo_path)
    logger.debug("Scanning repository to get remote identity")
    remote_identity = scan_repository(repo_path).get("remote_identity")

    if not remote_identity:
        logger.debug("No remote identity found, skipping client_identity_report")
        return

    logger.debug("Remote identity found: %s", remote_identity)
    report = {
        "type": "client_identity_report",
        "technical_identifier": remote_identity,
    }
    try:
        logger.debug("Sending client_identity_report to HUB: %s", report)
        await connection.send(json.dumps(report))
        logger.debug("client_identity_report sent successfully to HUB with technical_identifier: %s", remote_identity)
    except Exception:  # noqa: BLE001
        logger.warning("Failed to send client_identity_report to HUB")


async def _sync_state_reporter(connection: websockets.ClientConnection, stop_event: asyncio.Event, repo_path: str = ".", repo_polling_interval_sec: float = 10.0) -> None:
    """Periodically scan the repository and send state reports.

    Performs the Git scan periodically and sends state reports over the
    existing WebSocket connection, piggybacking on the heartbeat mechanism
    as specified in AD-008 (Local Repo State Reporting: one stream, one
    canonical read model).

    Sends the initial state report immediately on Client startup/connection,
    then periodically thereafter with a configurable interval (default 10 seconds).

    Args:
        connection: The WebSocket connection.
        stop_event: Event to signal stopping.
        repo_path: Path to the Git repository to scan.
        repo_polling_interval_sec: Configurable interval in seconds between periodic scans (default 10).
    """
    logger.debug("Starting state reporter for repository: repo_path=%s, polling_interval=%ss", repo_path, repo_polling_interval_sec)

    # Send client identity report immediately on Client startup/connection
    logger.debug("Step 1: Sending client identity report to HUB on startup")
    if not stop_event.is_set():
        await _send_client_identity_report(connection, repo_path)
    else:
        logger.debug("Stop event is set, skipping client identity report")

    # Send initial state report immediately on Client startup/connection
    logger.debug("Step 2: Sending initial Git state report to HUB on startup")
    if not stop_event.is_set():
        await _send_git_state_report(connection, repo_path)
    else:
        logger.debug("Stop event is set, skipping Git state report")

    logger.debug("Entering periodic Git state reporting loop with interval: %ss", repo_polling_interval_sec)
    while not stop_event.is_set():
        await _sleep_or_stop(repo_polling_interval_sec, stop_event)
        if not stop_event.is_set():
            logger.debug("Periodic scan triggered, sending Git state report to HUB")
            await _send_git_state_report(connection, repo_path)
        else:
            logger.debug("Stop event is set, exiting periodic reporting loop")


async def connect_and_run(
    url: str,
    token: str,
    *,
    heartbeat_interval: float = 10.0,
    repo_path: str = ".",
    stop_event: asyncio.Event | None = None,
    repo_polling_interval_sec: float = 10.0,
) -> None:
    """Maintain a persistent, authenticated WebSocket connection.

    Sends a `{"type": "heartbeat"}` message every `heartbeat_interval`
    seconds and drains incoming messages, concurrently. On any connection
    error or unexpected close, reconnects with exponential backoff and full
    jitter (base 1s, factor x2, capped at 30s), resetting the backoff to 0
    immediately on every successful reconnect. Loops forever until
    `stop_event` is set - the parameter exists purely for testability.

    Also periodically scans the local repository and sends Git state reports
    over the WebSocket connection using the `client_git_state_report` envelope format
    with a configurable 10-second safety tick fallback (default 10 seconds).
    """
    logger.debug("Initializing HUB WebSocket connection")
    logger.debug("Connection parameters: url=%s, repo_path=%s, heartbeat_interval=%ss, repo_polling_interval=%ss",
                 url, repo_path, heartbeat_interval, repo_polling_interval_sec)

    if stop_event is None:
        stop_event = asyncio.Event()

    backoff = _BASE_BACKOFF_SECONDS

    while not stop_event.is_set():
        stop_requested = False
        logger.debug("Attempting to connect to HUB WebSocket at: %s", url)
        try:
            # Pass token in query params as per backend convention: ?token=<jwt>
            ws_url = f"{url}?token={token}"
            logger.debug("WebSocket URL with token: %s", ws_url[:50] + "...")  # Don't log the full token
            async with websockets.connect(ws_url) as connection:
                logger.info("Successfully connected to HUB WebSocket")
                backoff = _BASE_BACKOFF_SECONDS

                # Create tasks and await them together
                tasks = [
                    asyncio.create_task(_send_heartbeats(connection, heartbeat_interval)),
                    asyncio.create_task(_receive_messages(connection)),
                    asyncio.create_task(_watch_stop(stop_event)),
                    asyncio.create_task(_sync_state_reporter(connection, stop_event, repo_path, repo_polling_interval_sec))
                ]

                logger.debug("All HUB communication tasks started successfully")
                try:
                    # Wait for all tasks to complete or for the stop event to be set
                    await asyncio.gather(*tasks)
                except ExceptionGroup as eg:
                    # Handle task exceptions
                    for exc in eg.exceptions:
                        logger.debug("Task exception: %s", exc)
                except Exception as e:
                    logger.debug("Gather exception: %s", e)
        except _StopRequested:
            logger.debug("Stop requested, exiting connection loop")
            stop_requested = True
        except ExceptionGroup as eg:
            fatal_reasons = [_fatal_reason(exc) for exc in eg.exceptions]
            fatal_reasons = [reason for reason in fatal_reasons if reason is not None]
            if fatal_reasons:
                logger.error(
                    "WebSocket rejected (%s) - not retrying; check BMAD_AUTH_TOKEN "
                    "or origin configuration.",
                    fatal_reasons[0],
                )
                stop_requested = True
            else:
                for exc in eg.exceptions:
                    logger.warning("WebSocket connection error: %s", exc)
        except (ConnectionClosedError, InvalidStatus) as exc:
            fatal_reason = _fatal_reason(exc)
            if fatal_reason:
                logger.error(
                    "WebSocket rejected (%s) - not retrying; check BMAD_AUTH_TOKEN "
                    "or origin configuration.",
                    fatal_reason,
                )
                stop_requested = True
            else:
                logger.warning("WebSocket connection error: %s", exc)
        except Exception as exc:  # noqa: BLE001 - any connection error triggers reconnect
            logger.warning("WebSocket connection error: %s", exc)

        if stop_requested or stop_event.is_set():
            logger.info("HUB connection loop terminated")
            return

        logger.debug("WebSocket connection lost, preparing to reconnect with backoff: %s seconds", backoff)
        delay = random.uniform(0, backoff)
        logger.debug("Waiting %s seconds before reconnect attempt...", delay)
        await _sleep_or_stop(delay, stop_event)
        backoff = min(backoff * _BACKOFF_FACTOR, _MAX_BACKOFF_SECONDS)
