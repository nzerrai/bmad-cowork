"""I/O matrix test: CLI entry point prints a status line and exits 0."""

from agent.main import main


def test_main_returns_success_exit_code(capsys) -> None:
    exit_code = main()
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ok" in captured.out
