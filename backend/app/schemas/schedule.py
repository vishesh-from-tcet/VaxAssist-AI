from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ScheduleSummary(BaseModel):
    total_rules: int
    completed_count: int
    upcoming_count: int
    overdue_count: int
    unverified_count: int


class ScheduleItem(BaseModel):
    rule_id: str
    vaccine_name: str
    dose: str
    recommended_age: str
    due_date: Optional[str] = None
    administered_date: Optional[str] = None
    overdue_since: Optional[str] = None
    overdue_days: Optional[int] = None
    days_until_due: Optional[int] = None
    is_due_now: Optional[bool] = None
    record_id: Optional[str] = None
    clinic: Optional[str] = None
    provider: Optional[str] = None
    batch_number: Optional[str] = None
    verification_status: Optional[str] = None
    status: str
    source: str
    schedule_version: str
    effective_date: str
    explanation: str


class MemberScheduleEvaluationResponse(BaseModel):
    member_id: str
    member_name: str
    date_of_birth: str
    calculated_age_days: int
    calculated_age_label: str
    country: str
    region: str
    schedule_version: str
    effective_date: str
    source: str
    summary: ScheduleSummary
    completed: List[ScheduleItem]
    upcoming: List[ScheduleItem]
    overdue: List[ScheduleItem]
    unknown_unverified: List[ScheduleItem]


class FamilyScheduleResponse(BaseModel):
    family_id: str
    family_name: str
    schedule_version: str
    source: str
    members_evaluations: List[MemberScheduleEvaluationResponse]


class ScheduleCatalogRule(BaseModel):
    rule_id: str
    country: str
    region: str
    vaccine: str
    vaccine_display_name: str
    dose: str
    recommended_age_label: str
    recommended_age_days: int
    overdue_grace_days: int
    description: str
    source: str
    schedule_version: str
    effective_date: str
