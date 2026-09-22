from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.db.mongo import mongo_db
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _user_doc_to_response(user_doc: Dict[str, Any]) -> UserResponse:
    """Helper to convert MongoDB user dict to UserResponse schema."""
    user_id = str(user_doc.get("_id", user_doc.get("id", "")))
    created_at = user_doc.get("created_at")
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()
    elif created_at is not None:
        created_at = str(created_at)

    return UserResponse(
        id=user_id,
        email=user_doc["email"],
        full_name=user_doc["full_name"],
        role=user_doc.get("role", "user"),
        is_active=user_doc.get("is_active", True),
        created_at=created_at
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, summary="Register New User")
async def register(payload: UserRegister):
    """Register a new user account with hashed password and return access token."""
    if mongo_db.db is None:
        mongo_db.connect()

    email_clean = payload.email.lower().strip()
    
    # Check if user already exists
    existing_user = await mongo_db.db.users.find_one({"email": email_clean})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "email": email_clean,
        "full_name": payload.full_name.strip(),
        "hashed_password": hash_password(payload.password),
        "role": "user",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

    try:
        result = await mongo_db.db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    access_token = create_access_token(subject=email_clean)
    user_response = _user_doc_to_response(user_doc)
    return TokenResponse(access_token=access_token, token_type="bearer", user=user_response)



@router.post("/login", response_model=TokenResponse, summary="User Login")
async def login(payload: UserLogin):
    """Authenticate email & password and return access token."""
    if mongo_db.db is None:
        mongo_db.connect()

    email_clean = payload.email.lower().strip()
    user = await mongo_db.db.users.find_one({"email": email_clean})

    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = create_access_token(subject=email_clean)
    user_response = _user_doc_to_response(user)
    return TokenResponse(access_token=access_token, token_type="bearer", user=user_response)


@router.post("/logout", summary="User Logout")
async def logout():
    """Logout current user session."""
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse, summary="Get Current User Profile")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve profile information for currently authenticated user."""
    return _user_doc_to_response(current_user)
