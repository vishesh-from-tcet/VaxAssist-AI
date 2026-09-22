from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from app.services.rag_retriever import rag_retriever

router = APIRouter(prefix="/knowledge", tags=["RAG Knowledge System"])


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="Question or search query for medical knowledge")
    top_k: int = Field(4, ge=1, le=20, description="Number of relevant knowledge chunks to return")
    vaccine_topic: Optional[str] = Field(None, description="Filter by topic (e.g. BCG, Hepatitis B, MMR, COVID-19)")
    country_region: Optional[str] = Field(None, description="Filter by region (e.g. GLOBAL, IN, US)")
    similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0, description="Minimum similarity threshold")


class KnowledgeChunkMetadata(BaseModel):
    title: str
    organization: str
    source: str
    publication_date: str
    page_section: str
    country_region: str
    vaccine_topic: str
    document_version: str
    source_file: str


class KnowledgeChunkResponse(BaseModel):
    chunk_id: str
    text: str
    similarity_score: float
    distance: float
    rank: int
    metadata: KnowledgeChunkMetadata


class KnowledgeSearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[KnowledgeChunkResponse]
    notice: str


@router.post("/search", response_model=KnowledgeSearchResponse, summary="Query Verified Vaccination Knowledge Base")
async def search_knowledge(payload: KnowledgeSearchRequest):
    """Semantic vector search across verified vaccination guidelines, schedules, and FAQs."""
    result = rag_retriever.retrieve(
        query=payload.query,
        top_k=payload.top_k,
        vaccine_topic=payload.vaccine_topic,
        country_region=payload.country_region,
        similarity_threshold=payload.similarity_threshold,
    )
    return KnowledgeSearchResponse(**result)


@router.get("/search", response_model=KnowledgeSearchResponse, summary="Query Verified Knowledge (GET)")
async def search_knowledge_get(
    q: str = Query(..., min_length=1, description="Question or search query"),
    top_k: int = Query(4, ge=1, le=20),
    topic: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
):
    """GET semantic search across verified vaccination knowledge base."""
    result = rag_retriever.retrieve(
        query=q,
        top_k=top_k,
        vaccine_topic=topic,
        country_region=region,
    )
    return KnowledgeSearchResponse(**result)


@router.get("/stats", summary="Knowledge Base Collection Statistics")
async def get_knowledge_stats():
    """Retrieve indexed document count, topic distribution, and vector database status."""
    return rag_retriever.get_stats()
