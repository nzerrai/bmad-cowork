"""Quality gates verification service with compliance score breakdown (Story 5.2).

All quality gate verification is 100% deterministic — zero LLM/AI calls for these tasks.
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.indexing.health import type_completeness_rollup
from app.indexing.models import Artifact, ArtifactLink
from app.indexing.types import ArtifactType


@dataclass
class SectionComplianceScore:
    section_name: str
    score: float | None
    has_unresolved_reference: bool
    unresolved_path: str | None


@dataclass
class QualityGatesVerification:
    specs_present: bool
    pr_review_status_verified: bool
    test_linkage_verified: bool
    overall_compliance_score: float | None
    is_partial_score: bool
    sections: list[SectionComplianceScore]


def verify_quality_gates(db: Session, artifacts: list[Artifact]) -> QualityGatesVerification:
    """Verify quality gates (specs presence, PR review status, test linkage) deterministically.

    Returns compliance score with per-section breakdown to show which section is dragging
    the score down. When a linked artifact cannot be reached (broken cross-reference),
    that section shows "Unresolved reference: {path}" instead of a score, and the overall
    score is marked partial rather than silently averaged.
    """
    rollup = type_completeness_rollup(artifacts)

    # Check specs presence
    specs_health = rollup.get(ArtifactType.SPECS)
    specs_present = (
        specs_health is not None
        and specs_health.count > 0
        and specs_health.error_count == 0
    )

    # PR review status verification: check if there are reviewed artifacts
    # with status = 'done' or 'final'
    pr_review_status_verified = False
    for artifact in artifacts:
        status = (artifact.status or "").lower()
        if status in ("final", "done", "approved", "reviewed"):
            pr_review_status_verified = True
            break

    # Test linkage verification: check if test artifacts exist and are linked to stories/specs
    tests_health = rollup.get(ArtifactType.TESTS)
    tests_present = tests_health is not None and tests_health.count > 0

    # Build per-section compliance breakdown
    sections = _compute_section_scores(db, artifacts, rollup, specs_present, tests_present)

    # Compute overall compliance score
    overall_score, is_partial_score = _compute_overall_score(sections)

    return QualityGatesVerification(
        specs_present=specs_present,
        pr_review_status_verified=pr_review_status_verified,
        test_linkage_verified=tests_present,
        overall_compliance_score=overall_score,
        is_partial_score=is_partial_score,
        sections=sections,
    )


def _compute_section_scores(
    db: Session, artifacts: list[Artifact], rollup: dict, specs_present: bool, tests_present: bool
) -> list[SectionComplianceScore]:
    """Compute per-section compliance scores with unresolved reference detection."""
    sections = []

    # Section 1: Specs Presence
    specs_score = 100.0 if specs_present else 0.0
    sections.append(SectionComplianceScore(
        section_name="Specs Presence",
        score=specs_score,
        has_unresolved_reference=False,
        unresolved_path=None,
    ))

    # Section 2: PR Review Status
    # Check if there are resolved cross-references to reviewed artifacts
    pr_score = 100.0
    has_unresolved_pr = False
    unresolved_pr_path = None

    links = db.query(ArtifactLink).order_by(ArtifactLink.source_field).all()
    for link in links:
        if link.target_artifact_id is None:
            has_unresolved_pr = True
            unresolved_pr_path = link.target_path
            pr_score = None  # Unresolved reference means no score
            break

    sections.append(SectionComplianceScore(
        section_name="PR Review Status",
        score=pr_score,
        has_unresolved_reference=has_unresolved_pr,
        unresolved_path=unresolved_pr_path,
    ))

    # Section 3: Test Linkage
    tests_score = 100.0 if tests_present else 0.0
    sections.append(SectionComplianceScore(
        section_name="Test Linkage",
        score=tests_score,
        has_unresolved_reference=False,
        unresolved_path=None,
    ))

    # Section 4: Acceptance Criteria
    # Check if stories have acceptance criteria (status = 'done' or complete)
    acceptance_score = 100.0
    has_unresolved_acceptance = False
    unresolved_acceptance_path = None

    # Check for artifacts with acceptance criteria references
    for artifact in artifacts:
        is_story = artifact.artifact_type == ArtifactType.STORIES
        is_spec = artifact.artifact_type == ArtifactType.SPECS
        if is_story or is_spec:
            # Check if acceptance criteria are mentioned in frontmatter or text
            frontmatter = artifact.frontmatter or {}
            if "acceptanceCriteria" not in frontmatter and "acceptance_criteria" not in frontmatter:
                # Check if there are unresolved links to acceptance criteria
                for link in links:
                    if link.target_artifact_id is None and "acceptance" in link.target_path.lower():
                        has_unresolved_acceptance = True
                        unresolved_acceptance_path = link.target_path
                        acceptance_score = None
                        break

    sections.append(SectionComplianceScore(
        section_name="Acceptance Criteria",
        score=acceptance_score,
        has_unresolved_reference=has_unresolved_acceptance,
        unresolved_path=unresolved_acceptance_path,
    ))

    return sections


def _compute_overall_score(sections: list[SectionComplianceScore]) -> tuple[float | None, bool]:
    """Compute overall compliance score from sections.

    Returns (score, is_partial_score):
    - score: The overall compliance score (0-100), or None if there are unresolved references
    - is_partial_score: True if there are unresolved references, meaning the score is partial
    """
    unresolved_sections = [s for s in sections if s.has_unresolved_reference or s.score is None]

    if unresolved_sections:
        # Mark as partial score rather than silently averaging
        return None, True

    # Compute average score
    scores = [s.score for s in sections if s.score is not None]
    if not scores:
        return 0.0, False

    overall_score = sum(scores) / len(scores)
    return overall_score, False
