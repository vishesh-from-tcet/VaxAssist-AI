from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId, errors as bson_errors
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.vaccination import (
    VaccinationCreate,
    VaccinationUpdate,
    VaccinationResponse,
)
from app.db.mongo import mongo_db
from app.api.deps import get_current_user

router = APIRouter(tags=["Vaccination Records"])


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


@router.post("/vaccinations", response_model=VaccinationResponse, status_code=status.HTTP_201_CREATED, summary="Log New Vaccination Record")
async def create_vaccination(
    payload: VaccinationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Log a new vaccination record for a family member belonging to the authenticated user."""
    if mongo_db.db is None:
        mongo_db.connect()

    user_id = str(current_user["id"])
    member_oid = _to_object_id(payload.member_id)

    # Verify that the target member belongs to the current user
    member = await mongo_db.db.members.find_one({"_id": member_oid, "user_id": user_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found or unauthorized access"
        )

    family_id = member.get("family_id")
    now = datetime.now(timezone.utc)

    doc = {
        "user_id": user_id,
        "family_id": family_id,
        "member_id": str(member_oid),
        "member_name": member.get("name", ""),
        "vaccine_name": payload.vaccine_name.strip(),
        "dose": payload.dose.strip(),
        "administration_date": payload.administration_date.strip(),
        "provider": payload.provider.strip() if payload.provider else None,
        "clinic": payload.clinic.strip() if payload.clinic else None,
        "batch_number": payload.batch_number.strip() if payload.batch_number else None,
        "notes": payload.notes.strip() if payload.notes else None,
        "source": payload.source or "manual",
        "verification_status": payload.verification_status or "verified",
        "created_at": now,
        "updated_at": now,
    }

    result = await mongo_db.db.vaccinations.insert_one(doc)
    doc["_id"] = result.inserted_id
    return VaccinationResponse(**_format_doc(doc))


@router.get("/vaccinations", response_model=List[VaccinationResponse], summary="List Vaccination Records")
async def list_vaccinations(
    member_id: Optional[str] = Query(None, description="Filter by family member ID"),
    family_id: Optional[str] = Query(None, description="Filter by family ID"),
    verification_status: Optional[str] = Query(None, description="Filter by status (verified, pending, self_reported)"),
    search: Optional[str] = Query(None, description="Search term for vaccine name, clinic, provider, or batch"),
    sort_by: str = Query("administration_date", description="Field to sort by (administration_date, vaccine_name, created_at)"),
    order: str = Query("desc", description="Sort order: asc or desc"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List vaccination records for the current user with filtering, search, and sorting."""
    if mongo_db.db is None:
        mongo_db.connect()

    user_id = str(current_user["id"])
    query: Dict[str, Any] = {"user_id": user_id}

    if member_id:
        query["member_id"] = member_id
    if family_id:
        query["family_id"] = family_id
    if verification_status:
        query["verification_status"] = verification_status

    if search:
        search_rgx = {"$regex": search.strip(), "$options": "i"}
        query["$or"] = [
            {"vaccine_name": search_rgx},
            {"provider": search_rgx},
            {"clinic": search_rgx},
            {"batch_number": search_rgx},
            {"member_name": search_rgx},
        ]

    sort_direction = -1 if order.lower() == "desc" else 1
    sort_field = sort_by if sort_by in ["administration_date", "vaccine_name", "created_at"] else "administration_date"

    cursor = mongo_db.db.vaccinations.find(query).sort(sort_field, sort_direction)
    records = await cursor.to_list(length=500)

    # In case member_name was updated, populate latest member name
    members_map = {}
    member_ids = list(set([r["member_id"] for r in records if "member_id" in r]))
    if member_ids:
        m_oids = []
        for mid in member_ids:
            try:
                m_oids.append(ObjectId(mid))
            except Exception:
                pass
        if m_oids:
            m_docs = await mongo_db.db.members.find({"_id": {"$in": m_oids}}).to_list(length=len(m_oids))
            for md in m_docs:
                members_map[str(md["_id"])] = md.get("name")

    results = []
    for r in records:
        f_doc = _format_doc(r)
        if f_doc.get("member_id") in members_map:
            f_doc["member_name"] = members_map[f_doc["member_id"]]
        results.append(VaccinationResponse(**f_doc))

    return results


@router.get("/vaccinations/{vaccination_id}", response_model=VaccinationResponse, summary="Get Single Vaccination Record")
async def get_vaccination(
    vaccination_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieve details for a single vaccination record."""
    if mongo_db.db is None:
        mongo_db.connect()

    user_id = str(current_user["id"])
    v_oid = _to_object_id(vaccination_id)

    record = await mongo_db.db.vaccinations.find_one({"_id": v_oid, "user_id": user_id})
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaccination record not found or unauthorized access"
        )

    # Get latest member name
    try:
        member = await mongo_db.db.members.find_one({"_id": ObjectId(record["member_id"])})
        if member:
            record["member_name"] = member.get("name", record.get("member_name"))
    except Exception:
        pass

    return VaccinationResponse(**_format_doc(record))


@router.put("/vaccinations/{vaccination_id}", response_model=VaccinationResponse, summary="Update Vaccination Record")
async def update_vaccination(
    vaccination_id: str,
    payload: VaccinationUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing vaccination record."""
    if mongo_db.db is None:
        mongo_db.connect()

    user_id = str(current_user["id"])
    v_oid = _to_object_id(vaccination_id)

    record = await mongo_db.db.vaccinations.find_one({"_id": v_oid, "user_id": user_id})
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaccination record not found or unauthorized access"
        )

    updates = {}
    if payload.member_id is not None:
        m_oid = _to_object_id(payload.member_id)
        member = await mongo_db.db.members.find_one({"_id": m_oid, "user_id": user_id})
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target family member not found or unauthorized access"
            )
        updates["member_id"] = str(m_oid)
        updates["member_name"] = member.get("name")
        updates["family_id"] = member.get("family_id")

    if payload.vaccine_name is not None:
        updates["vaccine_name"] = payload.vaccine_name.strip()
    if payload.dose is not None:
        updates["dose"] = payload.dose.strip()
    if payload.administration_date is not None:
        updates["administration_date"] = payload.administration_date.strip()
    if payload.provider is not None:
        updates["provider"] = payload.provider.strip()
    if payload.clinic is not None:
        updates["clinic"] = payload.clinic.strip()
    if payload.batch_number is not None:
        updates["batch_number"] = payload.batch_number.strip()
    if payload.notes is not None:
        updates["notes"] = payload.notes.strip()
    if payload.source is not None:
        updates["source"] = payload.source
    if payload.verification_status is not None:
        updates["verification_status"] = payload.verification_status

    updates["updated_at"] = datetime.now(timezone.utc)

    await mongo_db.db.vaccinations.update_one({"_id": v_oid, "user_id": user_id}, {"$set": updates})
    updated_rec = await mongo_db.db.vaccinations.find_one({"_id": v_oid, "user_id": user_id})
    
    # Refresh member name if needed
    try:
        member = await mongo_db.db.members.find_one({"_id": ObjectId(updated_rec["member_id"])})
        if member:
            updated_rec["member_name"] = member.get("name", updated_rec.get("member_name"))
    except Exception:
        pass

    return VaccinationResponse(**_format_doc(updated_rec))


@router.delete("/vaccinations/{vaccination_id}", summary="Delete Vaccination Record")
async def delete_vaccination(
    vaccination_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a vaccination record."""
    if mongo_db.db is None:
        mongo_db.connect()

    user_id = str(current_user["id"])
    v_oid = _to_object_id(vaccination_id)

    record = await mongo_db.db.vaccinations.find_one({"_id": v_oid, "user_id": user_id})
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaccination record not found or unauthorized access"
        )

    await mongo_db.db.vaccinations.delete_one({"_id": v_oid, "user_id": user_id})
    return {"message": f"Vaccination record for {record.get('vaccine_name')} successfully deleted", "id": vaccination_id}
