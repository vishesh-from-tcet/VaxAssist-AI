from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User question or query")
    member_id: Optional[str] = Field(None, description="Optional target family member ID for context grounding")
    conversation_history: Optional[List[ChatMessage]] = Field(default=[], description="Recent conversation turns")


class SourceCitation(BaseModel):
    title: str
    organization: str
    source: str
    publication_date: str
    page_section: str
    country_region: str
    vaccine_topic: str
    document_version: str
    similarity_score: Optional[float] = 0.0


class ChatResponse(BaseModel):
    response: str
    sources: List[SourceCitation] = []
    member_context_used: Optional[str] = None
    disclaimer: str


class SuggestedQuestionsResponse(BaseModel):
    general: List[str]
    member_specific: List[str]
