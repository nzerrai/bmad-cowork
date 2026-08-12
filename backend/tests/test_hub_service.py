"""Unit tests for hub service functions (Story 2.4; `check_repo_access`
rewritten for Story 6.1's revision -- see spec-6-1-...-2.md).

`check_repo_access` now shells out to a real `git ls-remote`, so these tests
mock `app.hub.service.subprocess.run` to stay deterministic and offline,
while still exercising the actual code path (env construction, credential
lookup/injection, timeout/error handling) rather than just asserting the
spec's I/O matrix.
"""

import os
import subprocess
import tempfile
from unittest.mock import MagicMock, patch

from app.hub.credentials import encrypt_credential
from app.hub.service import (
    _build_askpass_env,
    check_repo_access,
    detect_git_provider,
    generate_access_grant_link,
    get_or_create_space,
    is_valid_technical_identifier,
)


class TestDetectGitProvider:
    """Tests for detect_git_provider function."""

    def test_detect_github_https(self):
        assert detect_git_provider("https://github.com/org/repo.git") == "github"
        assert detect_git_provider("https://github.com/org/repo") == "github"

    def test_detect_github_ssh(self):
        assert detect_git_provider("git@github.com:org/repo.git") == "github"
        assert detect_git_provider("git@github.com:org/repo") == "github"

    def test_detect_gitlab_https(self):
        assert detect_git_provider("https://gitlab.com/org/project.git") == "gitlab"
        assert detect_git_provider("https://gitlab.com/org/project") == "gitlab"

    def test_detect_gitlab_ssh(self):
        assert detect_git_provider("git@gitlab.com:org/project.git") == "gitlab"

    def test_detect_gitlab_self_hosted(self):
        assert detect_git_provider("https://gitlab.example.com/org/project.git") == "gitlab"

    def test_detect_bitbucket_https(self):
        assert detect_git_provider("https://bitbucket.org/org/repo.git") == "bitbucket"
        assert detect_git_provider("https://bitbucket.org/org/repo") == "bitbucket"

    def test_detect_bitbucket_ssh(self):
        assert detect_git_provider("git@bitbucket.org:org/repo.git") == "bitbucket"

    def test_detect_bitbucket_self_hosted(self):
        assert detect_git_provider("https://bitbucket.example.com/org/repo.git") == "bitbucket"

    def test_detect_unknown_provider(self):
        assert detect_git_provider("https://unknown.git/org/repo.git") == "unknown"
        assert detect_git_provider("git@unknown.git:org/repo.git") == "unknown"


class TestGenerateAccessGrantLink:
    """Tests for generate_access_grant_link function."""

    def test_generate_github_link_with_repo(self):
        link = generate_access_grant_link("github", "https://github.com/org/repo.git")
        assert link == "https://github.com/org/repo/settings/keys"

    def test_generate_gitlab_link_with_repo(self):
        link = generate_access_grant_link("gitlab", "https://gitlab.com/org/project.git")
        assert link == "https://gitlab.com/org/project/-/repository/keys"

    def test_generate_bitbucket_link_with_repo(self):
        link = generate_access_grant_link("bitbucket", "https://bitbucket.org/org/repo.git")
        assert link == "https://bitbucket.org/org/repo/admin/access-keys"

    def test_generate_github_link_without_repo(self):
        link = generate_access_grant_link("github", "unknown-repo")
        assert link == "https://github.com/settings/apps"

    def test_generate_gitlab_link_without_repo(self):
        link = generate_access_grant_link("gitlab", "unknown-repo")
        assert link == "https://gitlab.com/-/profile/applications"

    def test_generate_bitbucket_link_without_repo(self):
        link = generate_access_grant_link("bitbucket", "unknown-repo")
        assert link == "https://bitbucket.org/account/settings/app-passwords/"

    def test_generate_unknown_provider_fallback(self):
        link = generate_access_grant_link("unknown", "https://unknown.git/org/repo.git")
        assert link == (
            "Veuillez accorder l'accès en lecture au dépôt depuis les "
            "paramètres de votre fournisseur Git."
        )


class TestIsValidTechnicalIdentifier:
    """Format-only validation used by the admin add-repo endpoint (400 on invalid URL)."""

    def test_valid_https(self):
        assert is_valid_technical_identifier("https://github.com/org/repo.git") is True

    def test_valid_ssh(self):
        assert is_valid_technical_identifier("git@github.com:org/repo.git") is True

    def test_invalid_format(self):
        assert is_valid_technical_identifier("not-a-repo-url") is False

    def test_invalid_empty_or_none(self):
        assert is_valid_technical_identifier("") is False
        assert is_valid_technical_identifier(None) is False


def _completed_process(returncode: int) -> subprocess.CompletedProcess:
    return subprocess.CompletedProcess(args=["git", "ls-remote"], returncode=returncode)


class TestCheckRepoAccess:
    """Tests for check_repo_access, mocking the `git ls-remote` subprocess call."""

    # PRIVATE_REPO_PENDING / ADMIN_ADD_MANUAL_REPO matrix rows: a public,
    # reachable repo (no credential needed).
    @patch("app.hub.service.subprocess.run")
    def test_public_repo_reachable_returns_true(self, mock_run):
        mock_run.return_value = _completed_process(0)

        assert check_repo_access(None, "https://github.com/org/repo.git") is True

        mock_run.assert_called_once()
        args, kwargs = mock_run.call_args
        assert args[0] == ["git", "ls-remote", "https://github.com/org/repo.git"]
        assert kwargs["timeout"] == 6

    # PRIVATE_REPO_PENDING matrix row: an inaccessible/private repo without
    # a stored credential stays unreachable.
    @patch("app.hub.service.subprocess.run")
    def test_private_repo_unreachable_returns_false(self, mock_run):
        mock_run.return_value = _completed_process(128)

        assert check_repo_access(None, "https://github.com/org/private-repo.git") is False

    @patch("app.hub.service.subprocess.run")
    def test_ssh_identifier_reachable_returns_true(self, mock_run):
        mock_run.return_value = _completed_process(0)

        assert check_repo_access(None, "git@github.com:org/repo.git") is True

    @patch("app.hub.service.subprocess.run")
    def test_ssh_identifier_unreachable_returns_false(self, mock_run):
        mock_run.return_value = _completed_process(128)

        assert check_repo_access(None, "git@github.com:org/private-repo.git") is False

    def test_invalid_identifier_returns_false_without_calling_git(self):
        with patch("app.hub.service.subprocess.run") as mock_run:
            assert check_repo_access(None, "") is False
            assert check_repo_access(None, None) is False
            mock_run.assert_not_called()

    # Security regression: `check_repo_access` is the single choke point
    # every caller (admin POST, WebSocket discovery report) goes through --
    # a malformed/malicious identifier must never reach the `git`
    # subprocess's argv, whichever path it arrived from.
    def test_malformed_identifier_rejected_without_calling_git(self):
        with patch("app.hub.service.subprocess.run") as mock_run:
            assert check_repo_access(None, "not-a-repo-url") is False
            mock_run.assert_not_called()

    def test_git_remote_helper_injection_rejected_without_calling_git(self):
        """`ext::<command>` is git's remote-helper syntax and can execute an
        arbitrary command if it ever reaches `git ls-remote`'s argv -- must
        be rejected by format validation before any subprocess spawns."""
        with patch("app.hub.service.subprocess.run") as mock_run:
            assert check_repo_access(None, "ext::sh -c touch /tmp/pwned") is False
            mock_run.assert_not_called()

    def test_option_injection_identifier_rejected_without_calling_git(self):
        """A string starting with `-` could be parsed as a `git`/`ls-remote`
        flag rather than a positional remote if it ever reached argv."""
        with patch("app.hub.service.subprocess.run") as mock_run:
            assert check_repo_access(None, "--upload-pack=touch /tmp/pwned") is False
            mock_run.assert_not_called()

    @patch("app.hub.service.subprocess.run")
    def test_timeout_returns_false(self, mock_run):
        mock_run.side_effect = subprocess.TimeoutExpired(cmd="git ls-remote", timeout=6)

        assert check_repo_access(None, "https://github.com/org/repo.git") is False

    @patch("app.hub.service.subprocess.run")
    def test_git_binary_missing_returns_false(self, mock_run):
        mock_run.side_effect = OSError("git executable not found")

        assert check_repo_access(None, "https://github.com/org/repo.git") is False

    # ADMIN_AUTHORIZES_REPO matrix row: a stored, valid credential unblocks
    # access to an otherwise-private HTTPS repo, injected via GIT_ASKPASS
    # (never embedded in the URL/argv).
    @patch("app.hub.service.subprocess.run")
    def test_stored_credential_unblocks_https_access(self, mock_run):
        mock_run.return_value = _completed_process(0)

        fake_space = MagicMock()
        fake_space.encrypted_credential = encrypt_credential("super-secret-token")
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = fake_space

        assert check_repo_access(mock_db, "https://github.com/org/private-repo.git") is True

        args, kwargs = mock_run.call_args
        assert args[0] == ["git", "ls-remote", "https://github.com/org/private-repo.git"]
        env = kwargs["env"]
        assert env is not None
        assert env["REPO_CREDENTIAL_TOKEN"] == "super-secret-token"
        assert "GIT_ASKPASS" in env
        # The credential never appears in argv (never in the URL either).
        assert "super-secret-token" not in args[0][2]

    # ADMIN_AUTHORIZES_REPO error path: a stored but still-refused
    # credential (invalid token) leaves access denied.
    @patch("app.hub.service.subprocess.run")
    def test_stored_credential_still_refused_returns_false(self, mock_run):
        mock_run.return_value = _completed_process(128)

        fake_space = MagicMock()
        fake_space.encrypted_credential = encrypt_credential("wrong-token")
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = fake_space

        assert check_repo_access(mock_db, "https://github.com/org/private-repo.git") is False

    # Never boundary: SSH identifiers are checked without credential
    # injection, even when a credential is stored for that identifier.
    @patch("app.hub.service.subprocess.run")
    def test_ssh_identifier_never_injects_credential(self, mock_run):
        mock_run.return_value = _completed_process(0)

        fake_space = MagicMock()
        fake_space.encrypted_credential = encrypt_credential("super-secret-token")
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = fake_space

        assert check_repo_access(mock_db, "git@github.com:org/repo.git") is True

        args, kwargs = mock_run.call_args
        assert kwargs["env"] is None
        mock_db.query.assert_not_called()

    @patch("app.hub.service.subprocess.run")
    def test_no_stored_credential_falls_back_to_plain_check(self, mock_run):
        mock_run.return_value = _completed_process(0)

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        assert check_repo_access(mock_db, "https://github.com/org/repo.git") is True

        args, kwargs = mock_run.call_args
        assert kwargs["env"] is None

    # A failure while writing the GIT_ASKPASS temp script (e.g. full disk,
    # unwritable temp dir) must not escape as an uncaught 500 -- it's just
    # another "access could not be verified" outcome.
    @patch("app.hub.service.subprocess.run")
    def test_askpass_script_write_failure_returns_false_gracefully(self, mock_run):
        fake_space = MagicMock()
        fake_space.encrypted_credential = encrypt_credential("super-secret-token")
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = fake_space

        with patch("app.hub.service.os.chmod", side_effect=OSError("disk full")):
            assert check_repo_access(mock_db, "https://github.com/org/private-repo.git") is False

        mock_run.assert_not_called()

    @patch("app.hub.service.subprocess.run")
    def test_askpass_script_write_failure_cleans_up_tempfile(self, mock_run):
        fake_space = MagicMock()
        fake_space.encrypted_credential = encrypt_credential("super-secret-token")
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = fake_space

        created_paths = []
        real_mkstemp = tempfile.mkstemp

        def _tracking_mkstemp(*args, **kwargs):
            fd, path = real_mkstemp(*args, **kwargs)
            created_paths.append(path)
            return fd, path

        with patch("app.hub.service.tempfile.mkstemp", side_effect=_tracking_mkstemp), patch(
            "app.hub.service.os.chmod", side_effect=OSError("disk full")
        ):
            check_repo_access(mock_db, "https://github.com/org/private-repo.git")

        assert created_paths, "expected mkstemp to have been called"
        assert not os.path.exists(created_paths[0])


class TestBuildAskpassEnv:
    """Tests for the GIT_ASKPASS script content (finding: username/password
    prompt branching, per conventional HTTPS PAT auth)."""

    def test_script_returns_placeholder_for_username_prompt_and_token_for_password_prompt(self):
        script_path, env = _build_askpass_env("super-secret-token")
        try:
            username_result = subprocess.run(
                [script_path, "Username for 'https://github.com': "],
                capture_output=True,
                text=True,
                env=env,
            )
            password_result = subprocess.run(
                [script_path, "Password for 'https://github.com': "],
                capture_output=True,
                text=True,
                env=env,
            )
            assert username_result.stdout.strip() == "x-access-token"
            assert password_result.stdout.strip() == "super-secret-token"
        finally:
            os.unlink(script_path)


class TestGetOrCreateSpaceOrigin:
    """Tests for the `origin` parameter added to get_or_create_space."""

    def test_default_origin_is_discovered(self, monkeypatch):
        monkeypatch.setattr("app.hub.service.check_repo_access", lambda db, identifier: True)

        class _FakeInsertResult:
            def on_conflict_do_nothing(self, index_elements):
                return self

        fake_space = MagicMock()
        fake_space.technical_identifier = "https://github.com/org/repo.git"

        db = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [None, fake_space]

        with patch("app.hub.service.insert") as mock_insert:
            mock_insert.return_value.values.return_value = _FakeInsertResult()
            get_or_create_space(db, "https://github.com/org/repo.git")

        _, insert_kwargs = mock_insert.return_value.values.call_args
        assert insert_kwargs["origin"] == "discovered"

    def test_manual_origin_is_passed_through(self):
        fake_space = MagicMock()
        fake_space.technical_identifier = "https://github.com/org/repo.git"

        db = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [None, fake_space]

        class _FakeInsertResult:
            def on_conflict_do_nothing(self, index_elements):
                return self

        with patch("app.hub.service.check_repo_access", return_value=True), patch(
            "app.hub.service.insert"
        ) as mock_insert:
            mock_insert.return_value.values.return_value = _FakeInsertResult()
            get_or_create_space(db, "https://github.com/org/repo.git", origin="manual")

        _, insert_kwargs = mock_insert.return_value.values.call_args
        assert insert_kwargs["origin"] == "manual"

    def test_existing_space_returned_without_reinsert(self):
        from app.hub.models import HubStatus

        existing = MagicMock()
        existing.status = HubStatus.ACTIVE

        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = existing

        result = get_or_create_space(db, "https://github.com/org/repo.git", origin="manual")

        assert result is existing
        db.commit.assert_not_called()
