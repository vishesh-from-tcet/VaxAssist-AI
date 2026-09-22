from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    SuggestedQuestionsResponse,
)
from app.services.care_coordinator import care_coordinator
from app.api.deps import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Care Coordinator"])


@router.post("/chat", response_model=ChatResponse, summary="Chat with AI Care Coordinator")
async def chat_with_care_coordinator(
    payload: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Inquire with VaxAssist AI Care Coordinator.
    Securely grounds responses in ChromaDB clinical vector knowledge and authorized patient records.
    """
    user_id = str(current_user["id"])
    
    # Format history if provided
    formatted_history = []
    if payload.conversation_history:
        for m in payload.conversation_history:
            formatted_history.append({"role": m.role, "content": m.content})

    result = await care_coordinator.chat(
        message=payload.message,
        user_id=user_id,
        member_id=payload.member_id,
        conversation_history=formatted_history,
    )

    return ChatResponse(**result)


@router.get("/suggested-questions", response_model=SuggestedQuestionsResponse, summary="Get Suggested Inquiry Prompts")
async def get_suggested_questions():
    """Retrieve curated context-aware clinical questions for quick inquiries."""
    return SuggestedQuestionsResponse(
        general=[
            "What does the MMR vaccine protect against?",
            "What is the recommended timing for the BCG birth dose?",
            "Can multiple vaccines be administered at the same visit?",
            "How should low-grade fever after vaccination be managed?",
            "Is the MMR vaccine safe for children with egg allergies?",
            "What is the difference between OPV and IPV polio vaccines?",
        ],
        member_specific=[
            "What vaccinations has this family member received?",
            "Which vaccinations are coming up next for this member?",
            "Are there any overdue vaccination doses for this profile?",
            "What does this member's immunization record show?",
            "Explain the side effects of this member's next scheduled vaccine.",
        ]
    )
