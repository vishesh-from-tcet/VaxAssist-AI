from typing import Optional, List
from pydantic import BaseModel, Field


class MemberBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Full name of family member")
    date_of_birth: str = Field(..., description="Date of birth (YYYY-MM-DD)")
    relationship: str = Field(..., description="Relationship to account holder (e.g., Self, Child, Spouse, Parent, Sibling, Other)")
    gender: Optional[str] = Field(None, description="Gender (Male, Female, Other, Prefer not to say)")
    blood_group: Optional[str] = Field(None, description="Blood Group (e.g. A+, B+, O+, AB+, etc.)")
    allergies: Optional[str] = Field(None, description="Known allergies or comma-separated list")
    medical_notes: Optional[str] = Field(None, description="Optional medical notes or conditions")


class MemberCreate(MemberBase):
    pass


class MemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    date_of_birth: Optional[str] = None
    relationship: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    medical_notes: Optional[str] = None


class MemberResponse(MemberBase):
    id: str
    family_id: str
    user_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    vaccination_count: Optional[int] = 0


class FamilyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Family unit name (e.g. The Sharma Family)")
    address: Optional[str] = Field(None, description="Primary address")
    emergency_contact: Optional[str] = Field(None, description="Emergency phone number or contact")


class FamilyCreate(FamilyBase):
    pass


class FamilyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    address: Optional[str] = None
    emergency_contact: Optional[str] = None


class FamilyResponse(FamilyBase):
    id: str
    user_id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    member_count: Optional[int] = 0


class FamilyWithMembersResponse(FamilyResponse):
    members: List[MemberResponse] = []
