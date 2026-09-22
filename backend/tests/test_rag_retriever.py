import os
import pytest
from httpx import AsyncClient, ASGITransport
import pypdf
from app.main import app
from app.services.rag_retriever import rag_retriever
from app.services.document_loader import (
    extract_text_from_file,
    chunk_document_text,
    ingest_document_file,
    ingest_knowledge_directory,
)


@pytest.fixture(scope="module", autouse=True)
def setup_knowledge_base():
    """Ensure knowledge base is ingested before running RAG tests."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    kb_dir = os.path.join(base_dir, "knowledge_base")
    if os.path.exists(kb_dir):
        ingest_knowledge_directory(base_dir=kb_dir, reset=False)


def test_relevant_query_retrieval():
    """Verify that clinical questions return relevant chunks with expected topic & source."""
    result = rag_retriever.retrieve(query="What is the schedule and dosage for BCG vaccine?", top_k=3)
    assert result["total_results"] > 0
    assert len(result["results"]) > 0

    topics = [r["metadata"]["vaccine_topic"] for r in result["results"]]
    assert any(t in ["BCG", "General Immunization", "National Immunization Schedule"] for t in topics)
    
    top_chunk = result["results"][0]
    assert "text" in top_chunk
    assert top_chunk["similarity_score"] > 0.3
    assert len(top_chunk["metadata"]["organization"]) > 0


def test_irrelevant_query_handling():
    """Verify that irrelevant questions are safely handled without crash."""
    result = rag_retriever.retrieve(query="How do I bake a triple chocolate birthday cake with caramel?", top_k=3)
    assert "results" in result
    # Handled safely without error
    assert result["total_results"] >= 0


def test_no_result_and_empty_query():
    """Verify safe empty response when query is empty string or whitespace."""
    res_empty = rag_retriever.retrieve(query="")
    assert res_empty["total_results"] == 0
    assert len(res_empty["results"]) == 0
    assert "empty" in res_empty.get("notice", "").lower()

    res_spaces = rag_retriever.retrieve(query="     ")
    assert res_spaces["total_results"] == 0


def test_metadata_preservation():
    """Verify all required metadata fields are strictly preserved in vector search."""
    result = rag_retriever.retrieve(query="MMR vaccine egg allergy", top_k=3, vaccine_topic="MMR")
    assert result["total_results"] > 0
    
    chunk = result["results"][0]
    meta = chunk["metadata"]
    
    required_keys = [
        "title",
        "organization",
        "source",
        "publication_date",
        "page_section",
        "country_region",
        "vaccine_topic",
        "document_version",
        "source_file"
    ]
    for key in required_keys:
        assert key in meta
        assert meta[key] is not None and len(str(meta[key])) > 0

    assert meta["vaccine_topic"] == "MMR"
    assert "v1.0.0-demo" in meta["document_version"]


def test_txt_and_markdown_document_loader(tmp_path):
    """Test text extraction and chunking from temporary txt and markdown files."""
    # 1. Test Markdown loader
    md_file = tmp_path / "test_guideline.md"
    md_file.write_text(
        "---\n"
        "title: Test Polio Guide\n"
        "organization: Test Health Org\n"
        "source: Test Manual\n"
        "publication_date: 2024-05-01\n"
        "country_region: IN\n"
        "vaccine_topic: Polio\n"
        "document_version: v1.0.0-demo\n"
        "---\n\n"
        "# Section 1: Overview\n"
        "Oral Polio Vaccine provides mucosal immunity.\n\n"
        "# Section 2: Dosing\n"
        "Given at 6, 10, and 14 weeks.",
        encoding="utf-8"
    )

    meta, text = extract_text_from_file(str(md_file))
    assert meta["title"] == "Test Polio Guide"
    assert meta["vaccine_topic"] == "Polio"
    assert meta["country_region"] == "IN"

    chunks = chunk_document_text(text, meta)
    assert len(chunks) == 2
    assert chunks[0]["metadata"]["page_section"] == "Section 1: Overview"
    assert chunks[1]["metadata"]["page_section"] == "Section 2: Dosing"

    # 2. Test TXT loader
    txt_file = tmp_path / "test_facts.txt"
    txt_file.write_text(
        "Title: Quick Facts\n"
        "Organization: Global Health\n"
        "Source: Factsheet\n"
        "Topic: General Vaccine FAQs\n"
        "Version: v1.0\n\n"
        "[SECTION: Introduction]\n"
        "Vaccines prevent severe illness and protect communities.",
        encoding="utf-8"
    )

    meta_txt, text_txt = extract_text_from_file(str(txt_file))
    assert meta_txt["title"] == "Quick Facts"
    assert meta_txt["vaccine_topic"] == "General Vaccine FAQs"


@pytest.mark.asyncio
async def test_knowledge_api_endpoints():
    """Verify REST API endpoints for RAG search and statistics."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. POST /api/v1/knowledge/search
        post_res = await ac.post("/api/v1/knowledge/search", json={
            "query": "What are the common mild side effects after vaccination?",
            "top_k": 3,
            "vaccine_topic": "Vaccine Safety FAQs"
        })
        assert post_res.status_code == 200
        post_data = post_res.json()
        assert post_data["total_results"] > 0
        assert len(post_data["results"]) > 0
        assert "metadata" in post_data["results"][0]

        # 2. GET /api/v1/knowledge/search
        get_res = await ac.get("/api/v1/knowledge/search?q=Hepatitis%20B%20birth%20dose&top_k=2")
        assert get_res.status_code == 200
        assert get_res.json()["total_results"] > 0

        # 3. GET /api/v1/knowledge/stats
        stats_res = await ac.get("/api/v1/knowledge/stats")
        assert stats_res.status_code == 200
        stats_data = stats_res.json()
        assert stats_data["status"] == "healthy"
        assert stats_data["total_chunks"] > 0
        assert len(stats_data["unique_topics"]) > 0
