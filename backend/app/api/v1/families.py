from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId, errors as bson_errors
from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.family import (
    FamilyCreate,
    FamilyUpdate,
    FamilyResponse,
    FamilyWithMembersResponse,
    MemberCreate,
    MemberUpdate,
    MemberResponse,
)
from app.db.mongo import mongo_db
from app.api.deps import get_current_user

router = APIRouter(tags=["Family Management"])


def _format_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to convert MongoDB document _id and datetime fields to strings."""
    if not doc:
        return {}
    res = dict(doc)
    res["id"] = str(res.get("_id", res.get("id", "")))
    if "_id" in res:
        del res["_id"]
    for dt_field in ["created_at", "updated_at"]:
        if isinstance(res.get(dt_field), datetime):
            res[dt_field] = res[dt_field].isoformat()
        elif res.get(dt_field) is not None:
            res[dt_field] = str(res[dt_field])
    return res


def _to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except (bson_errors.InvalidId, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ID format: {id_str}"
        )


@router.post("/families", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED, summary="Create Family")
async def create_family(
    payload: FamilyCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new family unit for the authenticated user."""
    if mongo_db.db is None:
        mongo_db.connect()

    user_id = str(current_user["id"])
    now = datetime.now(timezone.utc)
    family_doc = {
        "user_id": user_id,
        "name": payload.name.strip(),
        "address": payload.address.strip() if payload.address else None,
        "emergency_contact": payload.emergency_contact.strip() if payload.emergency_contact else None,
        "created_at": now,
        "updated_at": now,
    }

    result = await mongo_db.db.families.insert_one(family_doc)
    family_doc["_id"] = result.inserted_id
    formatted = _format_doc(family_doc)
    formatted["member_count"] = 0
    return FamilyResponse(**formatted)


@router.get("/families", response_model=List[FamilyResponse], summary="List User Families")
async def list_families(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all families belonging to the current user."""
    if mongo_db.db is None:
        mongo_db.connect()

    user_id = str(current_user["id"])
    cursor = mongo_db.db.families.find({"user_id": user_id}).sort("created_at", 1)
    families = await cursor.to_list(length=100)

    results = []
    for fam in families:
        fam_id = str(fam["_id"])
        member_count = await mongo_db.db.members.count_documents({"family_id": fam_id, "user_id": user_id})
        formatted = _format_doc(fam)
        formatted["member_count"] = member_count
        results.append(FamilyResponse(**formatted))

    return results


@router.get("/families/{family_id}", response_model=FamilyWithMembersResponse, summary="Get Family with Members")
async def get_family(
    family_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve family details along with all associated family members."""
    if mongo_db.db is None:
        mongo_db.connect()

    user_id = str(current_user["id"])
    oid = _to_object_id(family_id)

    family = await mongo_db.db.families.find_one({"_id": oid, "user_id": user_id})
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found or unauthorized access"
        )

    # Fetch members
    members_cursor = mongo_db.db.members.find({"family_id": str(oid), "user_id": user_id}).sort("created_at", 1)
    member_docs = await members_cursor.to_list(length=100)

    member_responses = []
    for m in member_docs:
        m_id = str(m["_id"])
        vax_count = await mongo_db.db.vaccinations.count_documents({"member_id": m_id, "user_id": user_id})
        f_member = _format_doc(m)
        f_member["vaccination_count"] = vax_count
        member_responses.append(MemberResponse(**f_member))

    formatted_fam = _format_doc(family)
    formatted_fam["member_count"] = len(member_responses)
    formatted_fam["members"] = member_responses
    return FamilyWithMembersResponse(**formatted_fam)


@router.put("/families/{family_id}", response_model=FamilyResponse, summary="Update Family")
async def update_family(
    family_id: str,
    payload: FamilyUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update family details (name, address, emergency contact)."""
    if mongo_db.db is None:
        mongo_db.connect()

    user_id = str(current_user["id"])
    oid = _to_object_id(family_id)

    family = await mongo_db.db.families.find_one({"_id": oid, "user_id": user_id})
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found or unauthorized access"
        )

    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.address is not None:
        updates["address"] = payload.address.strip()
    if payload.emergency_contact is not None:
        updates["emergency_contact"] = payload.emergency_contact.strip()

    updates["updated_at"] = datetime.now(timezone.utc)

    await mongo_db.db.families.update_one({"_id": oid, "user_id": user_id}, {"$set": updates})
    updated_fam = await mongo_db.db.families.find_one({"_id": oid, "user_id": user_id})
    
    member_count = await mongo_db.db.members.count_documents({"family_id": str(oid), "user_id": user_id})
    formatted = _format_doc(updated_fam)
    formatted["member_count"] = member_count
    return FamilyResponse(**formatted)


@router.post("/families/{family_id}/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED, summary="Add Family Member")
async def add_family_member(
    family_id: str,
    payload: MemberCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Add a new member to an existing family belonging to the user."""
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

    now = datetime.now(timezone.utc)
    member_doc = {
        "family_id": str(fam_oid),
        "user_id": user_id,
        "name": payload.name.strip(),
        "date_of_birth": payload.date_of_birth.strip(),
        "relationship": payload.relationship.strip(),
        "gender": payload.gender.strip() if payload.gender else None,
        "blood_group": payload.blood_group.strip() if payload.blood_group else None,
        "allergies": payload.allergies.strip() if payload.allergies else None,
        "medical_notes": payload.medical_notes.strip() if payload.medical_notes else None,
        "created_at": now,
        "updated_at": now,
    }

    result = await mongo_db.db.members.insert_one(member_doc)
    member_doc["_id"] = result.inserted_id
    formatted = _format_doc(member_doc)
    formatted["vaccination_count"] = 0
    return MemberResponse(**formatted)


@router.get("/members/{member_id}", response_model=MemberResponse, summary="Get Single Member")
async def get_member(
    member_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get single member details with vaccination count."""
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

    vax_count = await mongo_db.db.vaccinations.count_documents({"member_id": str(m_oid), "user_id": user_id})
    formatted = _format_doc(member)
    formatted["vaccination_count"] = vax_count
    return MemberResponse(**formatted)


@router.put("/members/{member_id}", response_model=MemberResponse, summary="Update Family Member")
async def update_member(
    member_id: str,
    payload: MemberUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update family member details."""
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

    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.date_of_birth is not None:
        updates["date_of_birth"] = payload.date_of_birth.strip()
    if payload.relationship is not None:
        updates["relationship"] = payload.relationship.strip()
    if payload.gender is not None:
        updates["gender"] = payload.gender.strip()
    if payload.blood_group is not None:
        updates["blood_group"] = payload.blood_group.strip()
    if payload.allergies is not None:
        updates["allergies"] = payload.allergies.strip()
    if payload.medical_notes is not None:
        updates["medical_notes"] = payload.medical_notes.strip()

    updates["updated_at"] = datetime.now(timezone.utc)

    await mongo_db.db.members.update_one({"_id": m_oid, "user_id": user_id}, {"$set": updates})
    updated_member = await mongo_db.db.members.find_one({"_id": m_oid, "user_id": user_id})

    vax_count = await mongo_db.db.vaccinations.count_documents({"member_id": str(m_oid), "user_id": user_id})
    formatted = _format_doc(updated_member)
    formatted["vaccination_count"] = vax_count
    return MemberResponse(**formatted)


@router.delete("/members/{member_id}", summary="Delete Family Member")
async def delete_member(
    member_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a family member and cascade remove their vaccination records."""
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

    # Cascade delete vaccination records for this member
    await mongo_db.db.vaccinations.delete_many({"member_id": str(m_oid), "user_id": user_id})

    # Delete member
    await mongo_db.db.members.delete_one({"_id": m_oid, "user_id": user_id})

    return {"message": f"Member {member.get('name')} and related records successfully removed", "id": member_id}
