from typing import Any, Dict, List, Optional
from bson import ObjectId, errors as bson_errors
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.schedule import (
    MemberScheduleEvaluationResponse,
    FamilyScheduleResponse,
    ScheduleCatalogRule,
)
from app.services.scheduler_engine import evaluate_member_schedule
from app.services.schedule_catalog import (
    get_schedule_catalog,
    SCHEDULE_VERSION,
    DEFAULT_SOURCE,
)
from app.db.mongo import mongo_db
from app.api.deps import get_current_user

router = APIRouter(tags=["Deterministic Vaccination Scheduling"])


def _to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except (bson_errors.InvalidId, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ID format: {id_str}"
        )


@router.get("/schedule/catalog", response_model=List[ScheduleCatalogRule], summary="List Versioned Schedule Rules")
async def list_schedule_rules(
    country: Optional[str] = Query(None, description="Country filter (e.g. IN, GLOBAL, US)"),
    region: Optional[str] = Query(None, description="Region filter"),
    version: Optional[str] = Query(None, description="Schedule version")
):
    """Retrieve official versioned schedule guidelines."""
    rules = get_schedule_catalog(country=country, region=region, version=version)
    return [ScheduleCatalogRule(**r) for r in rules]


@router.get("/schedule/{member_id}", response_model=MemberScheduleEvaluationResponse, summary="Evaluate Member Vaccination Schedule")
async def get_member_schedule(
    member_id: str,
    country: str = Query("IN", description="Target country guideline (IN, GLOBAL, US)"),
    region: str = Query("National", description="Target region"),
    schedule_version: str = Query(SCHEDULE_VERSION, description="Schedule rule version"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Deterministically evaluates immunization schedule milestones for a specific family member.
    Validates that the member belongs to the authenticated user.
    """
    if mongo_db.db is None:
        mongo_db.connect()

    user_id = str(current_user["id"])
    m_oid = _to_object_id(member_id)

    member = await mongo_db.db.members.find_one({"_id": m_oid, "user_id": user_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found or unauthorized access"
        )

    # Fetch all vaccination records for this member
    cursor = mongo_db.db.vaccinations.find({"member_id": str(m_oid), "user_id": user_id})
    raw_records = await cursor.to_list(length=200)

    # Format records
    formatted_records = []
    for r in raw_records:
        rec = dict(r)
        rec["id"] = str(rec.get("_id", ""))
        formatted_records.append(rec)

    member_dict = dict(member)
    member_dict["id"] = str(member["_id"])

    evaluation = evaluate_member_schedule(
        member_dob=member.get("date_of_birth", ""),
        member_profile=member_dict,
        vaccination_records=formatted_records,
        country=country,
        region=region,
        schedule_version=schedule_version,
    )

    return MemberScheduleEvaluationResponse(**evaluation)


@router.get("/schedule/family/{family_id}", response_model=FamilyScheduleResponse, summary="Evaluate Family Vaccination Schedule")
async def get_family_schedule(
    family_id: str,
    country: str = Query("IN", description="Target country guideline (IN, GLOBAL, US)"),
    region: str = Query("National", description="Target region"),
    schedule_version: str = Query(SCHEDULE_VERSION, description="Schedule rule version"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Deterministically evaluates immunization schedule milestones for all members in a family.
    Validates family ownership.
    """
    if mongo_db.db is None:
        mongo_db.connect()

    user_id = str(current_user["id"])
    fam_oid = _to_object_id(family_id)

    family = await mongo_db.db.families.find_one({"_id": fam_oid, "user_id": user_id})
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found or unauthorized access"
        )

    # Fetch family members
    members_cursor = mongo_db.db.members.find({"family_id": str(fam_oid), "user_id": user_id})
    members = await members_cursor.to_list(length=100)

    evaluations = []
    for m in members:
        m_id_str = str(m["_id"])
        vax_cursor = mongo_db.db.vaccinations.find({"member_id": m_id_str, "user_id": user_id})
        vax_docs = await vax_cursor.to_list(length=200)

        formatted_vax = []
        for r in vax_docs:
            rec = dict(r)
            rec["id"] = str(rec.get("_id", ""))
            formatted_vax.append(rec)

        m_dict = dict(m)
        m_dict["id"] = m_id_str

        ev = evaluate_member_schedule(
            member_dob=m.get("date_of_birth", ""),
            member_profile=m_dict,
            vaccination_records=formatted_vax,
            country=country,
            region=region,
            schedule_version=schedule_version,
        )
        evaluations.append(MemberScheduleEvaluationResponse(**ev))

    return FamilyScheduleResponse(
        family_id=str(family["_id"]),
        family_name=family.get("name", "Family"),
        schedule_version=schedule_version,
        source=DEFAULT_SOURCE,
        members_evaluations=evaluations,
    )
