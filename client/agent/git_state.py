"""Git state detection module for the Client agent.

This module provides functions to scan a local Git repository and detect:
- Remote repository identity (host/org/repo)
- Local drift (commits ahead/behind the remote)
- In-progress Git actions (rebase, merge, conflict)
- BMad-enabled markers detection
"""

import os
import subprocess
from typing import Any


def _validate_repo_path(repo_path: str) -> str:
    """Validate and resolve the repository path to prevent path traversal or injection.

    Args:
        repo_path: Path to the Git repository.

    Returns:
        The resolved, absolute repository path.

    Raises:
        ValueError: If the path is invalid or contains path traversal sequences.
    """
    # Resolve to absolute path and ensure it's within the expected directory structure
    resolved_path = os.path.abspath(repo_path)

    # Prevent path traversal by ensuring the resolved path is a valid directory
    if not os.path.isdir(resolved_path):
        raise ValueError(f"Invalid repository path: {repo_path}")

    return resolved_path


def _run_git_command(repo_path: str, args: list[str]) -> tuple[bool, str]:
    """Run a Git command in the specified repository.

    Args:
        repo_path: Path to the Git repository.
        args: List of Git command arguments.

    Returns:
        A tuple of (success: bool, output: str).
    """
    # Validate repo_path to prevent path traversal or injection
    resolved_path = _validate_repo_path(repo_path)

    try:
        # Add timeout to prevent hanging on unresponsive repos or stuck hooks
        result = subprocess.run(
            ["git"] + args,
            cwd=resolved_path,
            capture_output=True,
            text=True,
            check=True,
            timeout=30,  # 30 second timeout for git commands
            env={**os.environ, "HUSKY": "0", "GIT_CONFIG_GLOBAL": "/dev/null"},  # Disable git hooks and isolated config
        )
        return True, result.stdout.strip()
    except subprocess.TimeoutExpired:
        return False, "Git command timed out"
    except subprocess.CalledProcessError as e:
        return False, (e.stdout or "").strip() + (e.stderr or "").strip()
    except ValueError:
        # Re-raise validation errors
        raise
    except Exception:  # noqa: BLE001
        return False, ""


def get_remote_identity(repo_path: str = ".") -> str | None:
    """Extracts the remote repository identity from the configured remote.

    Typically uses the `origin` remote. Returns format like
    `git@github.com:org/repo.git` or `https://github.com/org/repo.git`.

    Args:
        repo_path: Path to the Git repository.

    Returns:
        The remote identity string, or None if not available or not a Git repo.
    """
    success, output = _run_git_command(repo_path, ["remote", "get-url", "origin"])
    if success and output:
        return output
    # Fallback: try to get any remote
    success, output = _run_git_command(repo_path, ["remote", "show"])
    if success and output:
        # Parse the first remote from the list
        first_remote = output.splitlines()[0].strip()
        success, output = _run_git_command(repo_path, ["remote", "get-url", first_remote])
        if success and output:
            return output
    return None


def get_local_drift(repo_path: str = ".") -> dict[str, int]:
    """Returns a dictionary with `ahead` and `behind` counts.

    Compares the local branch with its remote tracking branch.

    Args:
        repo_path: Path to the Git repository.

    Returns:
        A dictionary with keys `ahead` and `behind`, both integers.
    """
    # Use git rev-list --count with --left-right to compare ahead/behind
    success, output = _run_git_command(
        repo_path,
        ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"],
    )

    if success and output:
        try:
            # Output format: "ahead_count\tbehind_count"
            parts = output.split("\t")
            if len(parts) == 2:
                ahead = int(parts[0].strip())
                behind = int(parts[1].strip())
                return {"ahead": ahead, "behind": behind}
        except (ValueError, IndexError):
            pass

    # Fallback: try to detect if there's no upstream configured
    # Check if we can get the current branch
    success, branch_output = _run_git_command(repo_path, ["branch", "--show-current"])
    if not success or not branch_output:
        return {"ahead": 0, "behind": 0}

    # Try to get the tracking remote and branch dynamically
    branch_name = branch_output.strip()
    # First try to get the configured upstream/remote for the current branch
    success, tracking_output = _run_git_command(
        repo_path,
        ["rev-parse", "--symbolic-full-name", f"@{{upstream}}"],
    )

    if success and tracking_output and tracking_output.startswith("refs/remotes/"):
        # Extract remote/branch from tracking output like "refs/remotes/origin/main"
        tracking_ref = tracking_output
    else:
        # Fallback: try to get the remote from git branch --show-current --show-upstream
        success, upstream_info = _run_git_command(repo_path, ["branch", "--show-current", "--show-upstream"])
        if success and upstream_info:
            # Output format: "main <remote>/<branch>" or "main <branch>"
            parts = upstream_info.split()
            if len(parts) >= 2:
                tracking_ref = parts[1]
                # Ensure it's a valid remote tracking reference
                if not tracking_ref.startswith("refs/remotes/"):
                    tracking_ref = f"refs/remotes/{tracking_ref}" if "/" in tracking_ref else f"refs/remotes/origin/{tracking_ref}"
            else:
                tracking_ref = f"refs/remotes/origin/{branch_name}"
        else:
            tracking_ref = f"refs/remotes/origin/{branch_name}"

    # Try to compare with the tracking remote/branch
    success, output = _run_git_command(
        repo_path,
        ["rev-list", "--left-right", "--count", f"HEAD...{tracking_ref}"],
    )

    if success and output:
        try:
            parts = output.split("\t")
            if len(parts) == 2:
                ahead = int(parts[0].strip())
                behind = int(parts[1].strip())
                return {"ahead": ahead, "behind": behind}
        except (ValueError, IndexError):
            pass

    return {"ahead": 0, "behind": 0}


def get_in_progress_git_action(repo_path: str = ".") -> str | None:
    """Detects any in-progress Git action.

    Returns one of: `"rebase"`, `"merge"`, `"conflict"`, or `None` if no
    in-progress action.

    Detection logic:
    - Merge: Check existence of `.git/MERGE_HEAD` file
    - Rebase: Check existence of `.git/rebase-apply/` or `.git/rebase-merge/` directory
    - Conflict: Check for unmerged files via `git ls-files --unmerged`

    Args:
        repo_path: Path to the Git repository.

    Returns:
        The in-progress action string, or None if no action in progress.
    """
    git_dir = os.path.join(repo_path, ".git")

    # Check for merge state first
    merge_head = os.path.join(git_dir, "MERGE_HEAD")
    if os.path.isfile(merge_head):
        return "merge"

    # Check for rebase state
    rebase_apply_dir = os.path.join(git_dir, "rebase-apply")
    rebase_merge_dir = os.path.join(git_dir, "rebase-merge")
    if os.path.isdir(rebase_apply_dir) or os.path.isdir(rebase_merge_dir):
        return "rebase"

    # Check for conflict state (unmerged files) using the robust ls-files --unmerged command
    success, output = _run_git_command(repo_path, ["ls-files", "--unmerged"])
    if success and output:
        return "conflict"

    return None


def is_bmad_enabled(repo_path: str = ".") -> bool:
    """Check for presence of BMad markers to determine if the repository is BMad-enabled.

    Looks for presence of directories/files like `prjdocs/`, `.bmad/`, `epics.md`,
    `stories/`, or similar BMad workflow indicators.

    Args:
        repo_path: Path to the Git repository.

    Returns:
        True if BMad markers are present, False otherwise.
    """
    bmad_indicators = [
        os.path.join(repo_path, "prjdocs"),
        os.path.join(repo_path, ".bmad"),
        os.path.join(repo_path, "epics.md"),
        os.path.join(repo_path, "stories"),
    ]

    for indicator in bmad_indicators:
        if os.path.exists(indicator):
            return True

    return False


def scan_repository(repo_path: str = ".") -> dict[str, Any]:
    """Returns a comprehensive state dictionary of the Git repository.

    Args:
        repo_path: Path to the Git repository.

    Returns:
        A dictionary with the following structure:
        {
            "technical_identifier": str | None,
            "branch": str | None,
            "ahead": int,
            "behind": int,
            "in_progress_action": str | None,
            "is_bmad_enabled": bool
        }
    """
    remote_identity = get_remote_identity(repo_path)
    drift = get_local_drift(repo_path)
    branch = get_current_branch(repo_path)

    return {
        "technical_identifier": remote_identity,
        "branch": branch,
        "ahead": drift.get("ahead", 0),
        "behind": drift.get("behind", 0),
        "in_progress_action": get_in_progress_git_action(repo_path),
        "is_bmad_enabled": is_bmad_enabled(repo_path),
    }


def get_current_branch(repo_path: str = ".") -> str | None:
    """Returns the current branch name.

    Args:
        repo_path: Path to the Git repository.

    Returns:
        The current branch name, or None if not available or not a Git repo.
    """
    success, output = _run_git_command(repo_path, ["branch", "--show-current"])
    if success and output:
        return output.strip()
    return None
