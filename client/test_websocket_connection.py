#!/usr/bin/env python3
"""Test script to connect to the Backend WebSocket and send identity report."""

import asyncio
import json
import logging
import os
import sys

# Configure logging for debug output
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Add client directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent.realtime import connect_and_run
from agent.git_state import scan_repository


def load_config():
    """Load configuration from a JSON file or environment variables."""
    config_file = os.path.join(os.path.dirname(__file__), 'config.json')

    # Try to load from config file first
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
                ws_url = config.get('BACKEND_WS_URL', 'ws://localhost:8000/ws')
                token = config.get('BMAD_AUTH_TOKEN')

                if token:
                    return ws_url, token
        except Exception as e:
            print(f"Warning: Could not load config.json: {e}")
            # Fall through to environment variables

    # Fall back to environment variables
    ws_url = os.environ.get("BACKEND_WS_URL", "ws://localhost:8000/ws")
    token = os.environ.get("BMAD_AUTH_TOKEN")

    return ws_url, token


async def test_ws_connection():
    """Test WebSocket connection with identity reporting."""
    # Load configuration
    ws_url, token = load_config()

    print(f"Connecting to WebSocket: {ws_url}")
    print(f"Using token: {token[:20]}..." if token else "No token provided")

    # Scan local repo for identity
    repo_state = scan_repository(".")
    print(f"\nRepository state:")
    print(f"  Remote identity: {repo_state.get('technical_identifier')}")
    print(f"  Branch: {repo_state.get('branch')}")
    print(f"  Ahead: {repo_state.get('ahead', 0)}")
    print(f"  Behind: {repo_state.get('behind', 0)}")
    print(f"  In-progress action: {repo_state.get('in_progress_action')}")
    print(f"  BMad enabled: {repo_state.get('is_bmad_enabled')}")

    print("\nStarting WebSocket connection (press Ctrl+C to stop)...")

    try:
        await connect_and_run(
            url=ws_url,
            token=token,
            heartbeat_interval=10.0,
            repo_path=".",
        )
    except KeyboardInterrupt:
        print("\nWebSocket connection stopped by user.")


if __name__ == "__main__":
    # Load configuration
    ws_url, token = load_config()

    if not token:
        print("Error: BMAD_AUTH_TOKEN is not configured.")
        print("Please create a config.json file with your configuration:")
        print("Example config.json:")
        print("{")
        print('  "BACKEND_WS_URL": "ws://localhost:8000/ws",')
        print('  "BMAD_AUTH_TOKEN": "your_jwt_token_here"')
        print("}")
        print("\nOr set the BMAD_AUTH_TOKEN environment variable.")
        print("\nTo get a token, run:")
        print("curl -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"dev@example.com\", \"password\":\"correct-horse\"}'")
        sys.exit(1)

    asyncio.run(test_ws_connection())
