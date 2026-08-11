#!/usr/bin/env python3
"""Minimal WebSocket test script to isolate connection issues."""

import asyncio
import json
import os
import sys

import websockets

async def test_minimal_ws():
    # Load token from config
    config_file = os.path.join(os.path.dirname(__file__), 'config.json')
    token = "test-token-placeholder"
    ws_url = "ws://localhost:8000/ws"

    if os.path.exists(config_file):
        with open(config_file, 'r') as f:
            config = json.load(f)
            token = config.get('BMAD_AUTH_TOKEN', token)
            ws_url = config.get('BACKEND_WS_URL', ws_url)

    print(f"Testing WebSocket connection to: {ws_url}")
    print(f"Using token: {token[:20]}...")

    ws_url_with_token = f"{ws_url}?token={token}"

    try:
        print("Attempting to connect...")
        async with websockets.connect(ws_url_with_token) as websocket:
            print("Connected successfully!")
            # Send a heartbeat
            await websocket.send(json.dumps({"type": "heartbeat"}))
            print("Sent heartbeat")
            # Receive response
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            print(f"Received: {response}")
    except Exception as e:
        print(f"Connection error: {type(e).__name__}: {e}")


if __name__ == "__main__":
    asyncio.run(test_minimal_ws())
