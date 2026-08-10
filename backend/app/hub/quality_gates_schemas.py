"""Pydantic response schemas for quality gates verification with compliance score breakdown."""

from pydantic import BaseModel, ConfigDict


class SectionComplianceScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    section_name: str
    score: float | None
    has_unresolved_reference: bool
    unresolved_path: str | None


class QualityGatesVerificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    specs_present: bool
    pr_review_status_verified: bool
    test_linkage_verified: bool
    overall_compliance_score: float | None
    is_partial_score: bool
    sections: list[SectionComplianceScoreOut]


class ComplianceScoreBreakdownOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    overall_score: float | None
    is_partial_score: bool
    sections: list[SectionComplianceScoreOut]
