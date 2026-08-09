"""Unit tests for hub service functions (Story 2.4)."""

import pytest

from app.hub.service import detect_git_provider, generate_access_grant_link, check_repo_access


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
        assert link == "Veuillez accorder l'accès en lecture au dépôt depuis les paramètres de votre fournisseur Git."


class TestCheckRepoAccess:
    """Tests for check_repo_access function."""

    def test_check_repo_access_github_https(self):
        assert check_repo_access(None, "https://github.com/org/repo.git") is True

    def test_check_repo_access_github_ssh(self):
        assert check_repo_access(None, "git@github.com:org/repo.git") is True

    def test_check_repo_access_gitlab_https(self):
        assert check_repo_access(None, "https://gitlab.com/org/project.git") is True

    def test_check_repo_access_bitbucket_https(self):
        assert check_repo_access(None, "https://bitbucket.org/org/repo.git") is True

    def test_check_repo_access_invalid_identifier(self):
        assert check_repo_access(None, "") is False
        assert check_repo_access(None, None) is False
        assert check_repo_access(None, "invalid-string-no-pattern") is False
