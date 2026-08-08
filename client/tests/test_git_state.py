"""Tests for the Git state detection module."""

import os
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

# Add the client directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.git_state import (
    get_in_progress_git_action,
    get_local_drift,
    get_remote_identity,
    is_bmad_enabled,
    scan_repository,
)


class TestGitStateDetection(unittest.TestCase):
    """Test cases for Git state detection functions."""

    def setUp(self):
        """Set up a temporary Git repository for testing."""
        self.test_dir = tempfile.mkdtemp()

        # Initialize a Git repository
        os.makedirs(os.path.join(self.test_dir, ".git"), exist_ok=True)

        # Create a minimal .git structure
        os.makedirs(os.path.join(self.test_dir, ".git", "refs", "heads"), exist_ok=True)
        os.makedirs(os.path.join(self.test_dir, ".git", "refs", "remotes", "origin"), exist_ok=True)

        # Create a basic config file with origin remote
        config_content = """[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
[remote "origin"]
	url = git@github.com:test-org/test-repo.git
[fetch "origin"]
	remote = origin
	refspec = +refs/heads/*:refs/remotes/origin/*
"""
        with open(os.path.join(self.test_dir, ".git", "config"), "w") as f:
            f.write(config_content)

        # Create a HEAD file
        with open(os.path.join(self.test_dir, ".git", "HEAD"), "w") as f:
            f.write("ref: refs/heads/main\n")

    def tearDown(self):
        """Teardown: remove the temporary directory."""
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_get_remote_identity(self):
        """Test get_remote_identity() extracts the remote repository identity."""
        # Mock _run_git_command to return the remote identity
        with patch("agent.git_state._run_git_command") as mock_run:
            mock_run.return_value = (True, "git@github.com:test-org/test-repo.git")
            identity = get_remote_identity(self.test_dir)
            self.assertEqual(identity, "git@github.com:test-org/test-repo.git")

    def test_get_remote_identity_no_remote(self):
        """Test get_remote_identity() returns None when no remote is configured."""
        # Remove the config file
        os.remove(os.path.join(self.test_dir, ".git", "config"))

        # Mock _run_git_command to return failure for remote command
        with patch("agent.git_state._run_git_command") as mock_run:
            mock_run.return_value = (False, "")
            identity = get_remote_identity(self.test_dir)
            self.assertIsNone(identity)

    def test_get_local_drift(self):
        """Test get_local_drift() returns ahead and behind counts."""
        # Mock _run_git_command to return ahead=2, behind=1
        with patch("agent.git_state._run_git_command") as mock_run:
            # First call is for rev-list with upstream
            mock_run.side_effect = [
                (True, "2\t1"),  # rev-list output
            ]
            drift = get_local_drift(self.test_dir)
            self.assertEqual(drift, {"ahead": 2, "behind": 1})

    def test_get_local_drift_no_upstream(self):
        """Test get_local_drift() when no upstream is configured."""
        with patch("agent.git_state._run_git_command") as mock_run:
            # First call fails (no upstream), second call succeeds (branch name), third call succeeds (drift)
            mock_run.side_effect = [
                (False, ""),  # rev-list with upstream fails
                (True, "main"),  # branch --show-current
                (True, "0\t0"),  # rev-list with origin/main
            ]
            drift = get_local_drift(self.test_dir)
            self.assertEqual(drift, {"ahead": 0, "behind": 0})

    def test_get_in_progress_git_action_no_action(self):
        """Test get_in_progress_git_action() returns None when no action is in progress."""
        # Ensure no merge/rebase files exist and ls-files --unmerged returns empty
        with patch("agent.git_state._run_git_command") as mock_run:
            # Merge head and rebase dirs don't exist, ls-files --unmerged returns empty
            mock_run.side_effect = [
                (False, ""),  # status --porcelain
                (False, ""),  # ls-files --unmerged returns empty
            ]
            action = get_in_progress_git_action(self.test_dir)
            self.assertIsNone(action)

    def test_get_in_progress_git_action_merge(self):
        """Test get_in_progress_git_action() detects merge state."""
        # Create MERGE_HEAD file
        merge_head = os.path.join(self.test_dir, ".git", "MERGE_HEAD")
        with open(merge_head, "w") as f:
            f.write("abc123def456\n")

        action = get_in_progress_git_action(self.test_dir)
        self.assertEqual(action, "merge")

    def test_get_in_progress_git_action_rebase(self):
        """Test get_in_progress_git_action() detects rebase state."""
        # Create rebase-apply directory
        rebase_apply_dir = os.path.join(self.test_dir, ".git", "rebase-apply")
        os.makedirs(rebase_apply_dir, exist_ok=True)

        action = get_in_progress_git_action(self.test_dir)
        self.assertEqual(action, "rebase")

    def test_get_in_progress_git_action_conflict(self):
        """Test get_in_progress_git_action() detects conflict state."""
        # Mock ls-files --unmerged to return unmerged files
        with patch("agent.git_state._run_git_command") as mock_run:
            # Simulate: merge head check (os.path.exists returns False), rebase check (False),
            # status --porcelain (no unmerged), ls-files --unmerged (has unmerged)
            mock_run.side_effect = [
                (False, ""),  # status --porcelain
                (True, "100644 abc123 1\tfile.txt\n100644 def456 2\tfile.txt\n"),  # ls-files --unmerged
            ]
            action = get_in_progress_git_action(self.test_dir)
            self.assertEqual(action, "conflict")

    def test_is_bmad_enabled_with_prjdocs(self):
        """Test is_bmad_enabled() returns True when prjdocs directory exists."""
        os.makedirs(os.path.join(self.test_dir, "prjdocs"), exist_ok=True)
        self.assertTrue(is_bmad_enabled(self.test_dir))

    def test_is_bmad_enabled_with_bmad_dir(self):
        """Test is_bmad_enabled() returns True when .bmad directory exists."""
        os.makedirs(os.path.join(self.test_dir, ".bmad"), exist_ok=True)
        self.assertTrue(is_bmad_enabled(self.test_dir))

    def test_is_bmad_enabled_with_epics_md(self):
        """Test is_bmad_enabled() returns True when epics.md exists."""
        with open(os.path.join(self.test_dir, "epics.md"), "w") as f:
            f.write("# Epics\n")
        self.assertTrue(is_bmad_enabled(self.test_dir))

    def test_is_bmad_enabled_without_markers(self):
        """Test is_bmad_enabled() returns False when no BMad markers exist."""
        self.assertFalse(is_bmad_enabled(self.test_dir))

    def test_scan_repository_structure(self):
        """Test scan_repository() returns the expected comprehensive dictionary structure."""
        with patch("agent.git_state.get_remote_identity") as mock_remote, \
             patch("agent.git_state.get_local_drift") as mock_drift, \
             patch("agent.git_state.get_in_progress_git_action") as mock_action, \
             patch("agent.git_state.is_bmad_enabled") as mock_bmad:

            mock_remote.return_value = "git@github.com:test-org/test-repo.git"
            mock_drift.return_value = {"ahead": 2, "behind": 1}
            mock_action.return_value = None
            mock_bmad.return_value = True

            result = scan_repository(self.test_dir)

            self.assertIn("remote_identity", result)
            self.assertIn("drift", result)
            self.assertIn("in_progress_action", result)
            self.assertIn("is_bmad_enabled", result)

            self.assertEqual(result["remote_identity"], "git@github.com:test-org/test-repo.git")
            self.assertEqual(result["drift"], {"ahead": 2, "behind": 1})
            self.assertIsNone(result["in_progress_action"])
            self.assertTrue(result["is_bmad_enabled"])


if __name__ == "__main__":
    unittest.main()
