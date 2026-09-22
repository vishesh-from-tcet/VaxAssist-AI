from typing import Optional
from pydantic import BaseModel, Field


class VaccinationBase(BaseModel):
    member_id: str = Field(..., description="ID of the family member who received the vaccination")
    vaccine_name: str = Field(..., min_length=1, max_length=150, description="Name of the vaccine administered")
    dose: str = Field(..., min_length=1, max_length=50, description="Dose description (e.g., Dose 1, Dose 2, Booster 1, Annual)")
    administration_date: str = Field(..., description="Date of administration (YYYY-MM-DD)")
    provider: Optional[str] = Field(None, max_length=100, description="Administering healthcare professional or doctor")
    clinic: Optional[str] = Field(None, max_length=150, description="Clinic, hospital or vaccination center name")
    batch_number: Optional[str] = Field(None, max_length=100, description="Batch or lot number of the vaccine vial")
    notes: Optional[str] = Field(None, description="Clinical notes, reactions, or next scheduled date")
    source: Optional[str] = Field("manual", description="Source of record (manual, clinic_import, self_reported, official_record)")
    verification_status: Optional[str] = Field("verified", description="Status (verified, pending, self_reported)")


class VaccinationCreate(VaccinationBase):
    family_id: Optional[str] = None


class VaccinationUpdate(BaseModel):
    member_id: Optional[str] = None
    vaccine_name: Optional[str] = Field(None, min_length=1, max_length=150)
    dose: Optional[str] = Field(None, min_length=1, max_length=50)
    administration_date: Optional[str] = None
    provider: Optional[str] = None
    clinic: Optional[str] = None
    batch_number: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    verification_status: Optional[str] = None


class VaccinationResponse(VaccinationBase):
    id: str
    user_id: str
    family_id: str
    member_name: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
