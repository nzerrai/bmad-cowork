"""I/O matrix tests for the artifact indexing engine (Story 1.1, AC1-AC3).

Fixtures live under pytest's `tmp_path`, not the live `prjdocs/` tree — a
future edit to planning docs must not break this suite. Runs against the
same shared dev/CI PostgreSQL instance as `test_migrations.py`/`test_auth.py`.
"""

import importlib
from pathlib import Path

import pytest
from alembic.config import Config

from alembic import command
from app.db import SessionLocal
from app.indexing import cli
from app.indexing import config as config_module
from app.indexing.models import Artifact, ArtifactLink
from app.indexing.scanner import run_index
from app.indexing.types import ArtifactType

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


@pytest.fixture(scope="module", autouse=True)
def _reset_schema() -> None:
    """Guarantee a pristine slate once before this module's assertions."""
    cfg = Config(str(ALEMBIC_INI))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")


@pytest.fixture(autouse=True)
def _clear_index_tables():
    """Isolate each test: different `tmp_path` roots can reuse the same
    root-relative file paths (e.g. `brief.md`), which would otherwise
    collide against the shared DB's `file_path` unique constraint."""
    db = SessionLocal()
    try:
        db.query(ArtifactLink).delete()
        db.query(Artifact).delete()
        db.commit()
    finally:
        db.close()
    yield


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _write(root: Path, relative: str, content: str) -> Path:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def _artifact(db, file_path: str) -> Artifact | None:
    return db.query(Artifact).filter(Artifact.file_path == file_path).first()


# --- AC1: discovery + cataloguing, one fixture per implemented type -------


def test_indexes_one_file_per_implemented_type_with_valid_frontmatter(tmp_path, db):
    _write(
        tmp_path,
        "briefs/my-brief/brief.md",
        "---\ntitle: My Brief\nstatus: draft\n---\n\n# Brief\n",
    )
    _write(
        tmp_path,
        "prds/my-prd/prd.md",
        "---\ntitle: My PRD\nstatus: final\n---\n\n# PRD\n",
    )
    _write(
        tmp_path,
        "architecture/my-arch/SPINE.md",
        "---\nname: my-arch\nstatus: final\n---\n\n# Architecture\n",
    )
    _write(
        tmp_path,
        "ux-designs/my-ux/DESIGN.md",
        "---\nname: my-ux\nstatus: draft\n---\n\n# Design\n",
    )
    _write(
        tmp_path,
        "epics.md",
        "---\nstepsCompleted: []\n---\n\n# Epics\n",
    )
    _write(
        tmp_path,
        "implementation-artifacts/spec-1-1-thing.md",
        "---\ntitle: Thing Spec\nstatus: draft\n---\n\n# Spec\n",
    )
    _write(
        tmp_path,
        "implementation-artifacts/1-1-my-story.md",
        "# Story 1.1: My Story\n\nStatus: ready-for-dev\n",
    )

    result = run_index(tmp_path, db)

    assert result.scanned == 7
    assert result.inserted == 7
    assert result.errors == 0

    brief = _artifact(db, "briefs/my-brief/brief.md")
    assert brief.artifact_type == ArtifactType.BRIEF
    assert brief.title == "My Brief"
    assert brief.status == "draft"
    assert brief.error is None

    prd = _artifact(db, "prds/my-prd/prd.md")
    assert prd.artifact_type == ArtifactType.PRD
    assert prd.title == "My PRD"
    assert prd.status == "final"

    arch = _artifact(db, "architecture/my-arch/SPINE.md")
    assert arch.artifact_type == ArtifactType.ARCHITECTURE
    assert arch.title == "my-arch"  # no `title` key, falls back to `name`
    assert arch.status == "final"

    ux = _artifact(db, "ux-designs/my-ux/DESIGN.md")
    assert ux.artifact_type == ArtifactType.UX
    assert ux.title == "my-ux"

    epics = _artifact(db, "epics.md")
    assert epics.artifact_type == ArtifactType.EPICS
    assert epics.frontmatter == {"stepsCompleted": []}

    spec = _artifact(db, "implementation-artifacts/spec-1-1-thing.md")
    assert spec.artifact_type == ArtifactType.SPECS
    assert spec.title == "Thing Spec"

    story = _artifact(db, "implementation-artifacts/1-1-my-story.md")
    assert story.artifact_type == ArtifactType.STORIES
    # No frontmatter for stories: title derived from the heading, status
    # derived from the plain-text `Status:` line in the body.
    assert story.title == "My Story"
    assert story.status == "ready-for-dev"
    assert story.frontmatter is None
    assert story.error is None


def test_story_file_with_no_frontmatter_is_not_flagged_malformed(tmp_path, db):
    _write(
        tmp_path,
        "implementation-artifacts/2-1-another-story.md",
        "# Story 2.1: Another Story\n\nStatus: in-progress\n",
    )

    result = run_index(tmp_path, db)

    assert result.errors == 0
    story = _artifact(db, "implementation-artifacts/2-1-another-story.md")
    assert story is not None
    assert story.error is None
    assert story.title == "Another Story"
    assert story.status == "in-progress"


def test_story_file_with_no_status_line_indexes_with_null_status(tmp_path, db):
    _write(
        tmp_path,
        "implementation-artifacts/2-2-no-status-story.md",
        "# Story 2.2: No Status Story\n\nSome body text with no Status line.\n",
    )

    result = run_index(tmp_path, db)

    assert result.errors == 0
    story = _artifact(db, "implementation-artifacts/2-2-no-status-story.md")
    assert story is not None
    assert story.error is None
    assert story.status is None


def test_unquoted_yaml_dates_in_frontmatter_are_stored_without_error(tmp_path, db):
    """Real frontmatter in this repo (e.g. prd.md/brief.md) uses unquoted
    `created`/`updated` dates, which PyYAML parses as `datetime.date` — not
    directly JSON-serializable for the `frontmatter` JSONB column."""
    _write(
        tmp_path,
        "prds/dated-prd/prd.md",
        "---\ntitle: Dated PRD\nstatus: final\n"
        "created: 2026-08-01\nupdated: 2026-08-06\n---\n\n# PRD\n",
    )

    result = run_index(tmp_path, db)

    assert result.errors == 0
    prd = _artifact(db, "prds/dated-prd/prd.md")
    assert prd.error is None
    assert prd.frontmatter["created"] == "2026-08-01"
    assert prd.frontmatter["updated"] == "2026-08-06"


# --- AC3: malformed frontmatter --------------------------------------------


def test_invalid_yaml_frontmatter_is_flagged_without_aborting_the_run(tmp_path, db):
    _write(
        tmp_path,
        "briefs/broken/brief.md",
        "---\ntitle: [unclosed\n---\n\n# Broken\n",
    )
    _write(
        tmp_path,
        "briefs/fine/brief.md",
        "---\ntitle: Fine Brief\nstatus: draft\n---\n\n# Fine\n",
    )

    result = run_index(tmp_path, db)

    assert result.scanned == 2
    assert result.errors == 1

    broken = _artifact(db, "briefs/broken/brief.md")
    assert broken is not None
    assert broken.error is not None
    assert broken.title is None
    assert broken.frontmatter is None

    fine = _artifact(db, "briefs/fine/brief.md")
    assert fine.error is None
    assert fine.title == "Fine Brief"


# --- AC1: cross-reference extraction ---------------------------------------


def test_cross_references_resolve_and_flag_broken_targets(tmp_path, db):
    _write(
        tmp_path,
        "prds/target-prd/prd.md",
        "---\ntitle: Target PRD\nstatus: final\n---\n\n# PRD\n",
    )
    _write(
        tmp_path,
        "epics.md",
        "---\n"
        "inputDocuments:\n"
        "  - prds/target-prd/prd.md\n"
        "  - prds/missing-prd/prd.md\n"
        "---\n\n# Epics\n",
    )

    run_index(tmp_path, db)

    epics = _artifact(db, "epics.md")
    links = db.query(ArtifactLink).filter(ArtifactLink.source_artifact_id == epics.id).all()
    links_by_target_path = {link.target_path: link for link in links}

    resolved = links_by_target_path["prds/target-prd/prd.md"]
    assert resolved.source_field == "inputDocuments"
    target = _artifact(db, "prds/target-prd/prd.md")
    assert resolved.target_artifact_id == target.id

    broken = links_by_target_path["prds/missing-prd/prd.md"]
    assert broken.target_artifact_id is None


# --- AC2: idempotent re-scan / change detection ----------------------------


def test_rerun_leaves_unchanged_rows_untouched_and_refreshes_changed_rows(tmp_path, db):
    stable_path = _write(
        tmp_path,
        "briefs/stable/brief.md",
        "---\ntitle: Stable\nstatus: draft\n---\n\n# Stable\n",
    )
    changing_path = _write(
        tmp_path,
        "briefs/changing/brief.md",
        "---\ntitle: Before\nstatus: draft\n---\n\n# Changing\n",
    )

    first = run_index(tmp_path, db)
    assert first.inserted == 2
    assert first.updated == 0

    stable_before = _artifact(db, "briefs/stable/brief.md")
    changing_before = _artifact(db, "briefs/changing/brief.md")
    # Captured as scalars, not just object refs: `run_index` reuses the same
    # identity-mapped ORM objects, so `changing_before` itself gets mutated
    # in place by the second `run_index` call below.
    stable_indexed_at_before = stable_before.indexed_at
    stable_id_before = stable_before.id
    changing_indexed_at_before = changing_before.indexed_at

    changing_path.write_text(
        "---\ntitle: After\nstatus: final\n---\n\n# Changing\n", encoding="utf-8"
    )

    second = run_index(tmp_path, db)

    assert second.scanned == 2
    assert second.inserted == 0
    assert second.updated == 1
    assert second.unchanged == 1

    stable_after = _artifact(db, "briefs/stable/brief.md")
    assert stable_after.id == stable_id_before
    assert stable_after.indexed_at == stable_indexed_at_before
    assert stable_after.title == "Stable"

    changing_after = _artifact(db, "briefs/changing/brief.md")
    assert changing_after.title == "After"
    assert changing_after.status == "final"
    assert changing_after.indexed_at != changing_indexed_at_before

    # No duplicate rows for either path.
    stable_rel = stable_path.relative_to(tmp_path).as_posix()
    changing_rel = changing_path.relative_to(tmp_path).as_posix()
    assert db.query(Artifact).filter(Artifact.file_path == stable_rel).count() == 1
    assert db.query(Artifact).filter(Artifact.file_path == changing_rel).count() == 1


def test_rerun_after_cross_reference_change_replaces_old_links_without_duplicates(
    tmp_path, db
):
    _write(tmp_path, "prds/a/prd.md", "---\ntitle: A\nstatus: final\n---\n\n# A\n")
    _write(tmp_path, "prds/b/prd.md", "---\ntitle: B\nstatus: final\n---\n\n# B\n")
    epics_path = _write(
        tmp_path,
        "epics.md",
        "---\ninputDocuments:\n  - prds/a/prd.md\n---\n\n# Epics\n",
    )

    run_index(tmp_path, db)
    epics = _artifact(db, "epics.md")
    links = db.query(ArtifactLink).filter(ArtifactLink.source_artifact_id == epics.id).all()
    assert {link.target_path for link in links} == {"prds/a/prd.md"}

    epics_path.write_text(
        "---\ninputDocuments:\n  - prds/b/prd.md\n---\n\n# Epics\n", encoding="utf-8"
    )
    run_index(tmp_path, db)

    links_after = db.query(ArtifactLink).filter(
        ArtifactLink.source_artifact_id == epics.id
    ).all()
    assert {link.target_path for link in links_after} == {"prds/b/prd.md"}
    assert len(links_after) == 1


# --- AC1: cross-reference resolution edge cases -----------------------------


def test_cross_reference_repo_root_relative_path_resolves(tmp_path, db):
    """Real frontmatter in this repo writes cross-references relative to the
    repo root (e.g. `prjdocs/planning-artifacts/...`), not relative to
    `ARTIFACT_ROOT`. `_resolve_target` must strip that leading segment."""
    _write(
        tmp_path,
        "prds/target/prd.md",
        "---\ntitle: Target\nstatus: final\n---\n\n# PRD\n",
    )
    root_name = tmp_path.name
    _write(
        tmp_path,
        "epics.md",
        f"---\ninputDocuments:\n  - {root_name}/prds/target/prd.md\n---\n\n# Epics\n",
    )

    run_index(tmp_path, db)

    epics = _artifact(db, "epics.md")
    link = db.query(ArtifactLink).filter(ArtifactLink.source_artifact_id == epics.id).first()
    assert link.target_path == f"{root_name}/prds/target/prd.md"
    target = _artifact(db, "prds/target/prd.md")
    assert link.target_artifact_id == target.id


def test_single_string_cross_reference_value_is_treated_as_one_item_list(tmp_path, db):
    _write(
        tmp_path,
        "prds/target/prd.md",
        "---\ntitle: Target\nstatus: final\n---\n\n# PRD\n",
    )
    _write(
        tmp_path,
        "epics.md",
        "---\ninputDocuments: prds/target/prd.md\n---\n\n# Epics\n",
    )

    run_index(tmp_path, db)

    epics = _artifact(db, "epics.md")
    links = db.query(ArtifactLink).filter(ArtifactLink.source_artifact_id == epics.id).all()
    assert len(links) == 1
    assert links[0].target_path == "prds/target/prd.md"


# --- AC3: robustness beyond frontmatter parse failures ----------------------


def test_non_utf8_file_is_flagged_with_error_and_does_not_abort_the_run(tmp_path, db):
    bad_path = tmp_path / "briefs" / "bad" / "brief.md"
    bad_path.parent.mkdir(parents=True, exist_ok=True)
    bad_path.write_bytes(b"---\ntitle: Bad\n---\n\n# Bad \xff\xfe\n")
    _write(
        tmp_path,
        "briefs/fine/brief.md",
        "---\ntitle: Fine Brief\nstatus: draft\n---\n\n# Fine\n",
    )

    result = run_index(tmp_path, db)

    assert result.scanned == 2
    assert result.errors == 1

    bad = _artifact(db, "briefs/bad/brief.md")
    assert bad is not None
    assert bad.error is not None

    fine = _artifact(db, "briefs/fine/brief.md")
    assert fine.error is None
    assert fine.title == "Fine Brief"


def test_non_string_status_value_is_stringified_not_dropped(tmp_path, db):
    _write(
        tmp_path,
        "briefs/numeric-status/brief.md",
        "---\ntitle: Numeric\nstatus: 1\n---\n\n# Brief\n",
    )

    run_index(tmp_path, db)

    brief = _artifact(db, "briefs/numeric-status/brief.md")
    assert brief.status == "1"


# --- AC1: classification edge cases -----------------------------------------


def test_double_digit_epic_and_story_numbers_are_classified_as_stories(tmp_path, db):
    _write(
        tmp_path,
        "implementation-artifacts/10-1-double-digit-epic.md",
        "# Story 10.1: Double Digit Epic\n\nStatus: ready-for-dev\n",
    )
    _write(
        tmp_path,
        "implementation-artifacts/1-10-double-digit-story.md",
        "# Story 1.10: Double Digit Story\n\nStatus: ready-for-dev\n",
    )

    run_index(tmp_path, db)

    epic10 = _artifact(db, "implementation-artifacts/10-1-double-digit-epic.md")
    story10 = _artifact(db, "implementation-artifacts/1-10-double-digit-story.md")
    assert epic10 is not None
    assert epic10.artifact_type == ArtifactType.STORIES
    assert story10 is not None
    assert story10.artifact_type == ArtifactType.STORIES


# --- CLI entry point + ARTIFACT_ROOT config ---------------------------------


def test_cli_main_uses_configured_root_and_prints_summary(tmp_path, monkeypatch, capsys):
    _write(
        tmp_path,
        "briefs/x/brief.md",
        "---\ntitle: X\nstatus: draft\n---\n\n# X\n",
    )
    monkeypatch.setattr(cli, "ARTIFACT_ROOT", tmp_path)

    cli.main()

    captured = capsys.readouterr()
    assert str(tmp_path) in captured.out
    assert "1 new" in captured.out


def test_artifact_root_env_var_overrides_default(monkeypatch, tmp_path):
    monkeypatch.setenv("ARTIFACT_ROOT", str(tmp_path))
    try:
        importlib.reload(config_module)
        assert config_module.ARTIFACT_ROOT == tmp_path
    finally:
        importlib.reload(config_module)


def test_default_artifact_root_falls_back_to_repo_prjdocs(monkeypatch):
    monkeypatch.delenv("ARTIFACT_ROOT", raising=False)
    try:
        importlib.reload(config_module)
        assert config_module.ARTIFACT_ROOT.name == "prjdocs"
        assert config_module.ARTIFACT_ROOT.is_dir()
    finally:
        importlib.reload(config_module)
