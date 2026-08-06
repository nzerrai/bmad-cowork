"""Client agent CLI entry point.

Story 0.1 scope: boot-check only. No Git-scanning or WebSocket logic yet
(that's Epic 2's Story 2.1/2.2). Starts, prints a status line, exits cleanly.
"""

import sys

__version__ = "0.1.0"


def main() -> int:
    """Print a version/status line and return a success exit code."""
    print(f"bmad-portal client agent v{__version__}: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
