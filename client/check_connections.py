#!/usr/bin/env python3
"""Script to check active WebSocket connections in the HUB."""

import json
import urllib.request
import time
import sys

def check_connections():
    """Check active WebSocket connections via the /ws/status endpoint."""
    try:
        response = urllib.request.urlopen('http://localhost:8000/ws/status', timeout=5)
        data = json.loads(response.read().decode())
        print("WebSocket Connections Status:")
        print(f"  Total connections: {data['total_connections']}")
        print(f"  Connected users: {data['connected_users_count']}")
        if data['connected_users']:
            print("  Connected user IDs:")
            for user_id in data['connected_users']:
                print(f"    - {user_id}")
    except Exception as e:
        print(f"Error checking connections: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == '--watch':
        print("Watching WebSocket connections... (Press Ctrl+C to stop)")
        try:
            while True:
                print(f"\n[{time.strftime('%H:%M:%S')}]")
                check_connections()
                time.sleep(2)
        except KeyboardInterrupt:
            print("\nStopped watching.")
    else:
        check_connections()
