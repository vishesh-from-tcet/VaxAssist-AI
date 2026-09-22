"""
RAG Retriever Service for VaxAssist AI Knowledge Base.

Retrieval Steps:
1. Accept query & filters.
2. Search ChromaDB collection.
3. Return relevant chunks sorted by similarity.
4. Return rich source metadata.
5. Handle no-result / empty / irrelevant queries safely.
"""

import logging
from typing import List, Dict, Any, Optional
from app.db.chroma import chroma_db

logger = logging.getLogger(__name__)


class KnowledgeRetrieverService:

    def __init__(self):
        self._collection = None

    def _get_collection(self):
        if self._collection is None:
            self._collection = chroma_db.get_or_create_knowledge_collection()
        return self._collection

    def retrieve(
        self,
        query: str,
        top_k: int = 4,
        vaccine_topic: Optional[str] = None,
        country_region: Optional[str] = None,
        similarity_threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Execute semantic similarity search over verified vaccination knowledge.
        
        Returns:
            Dict containing:
                - query: str
                - total_results: int
                - results: List of chunks with metadata and distance scores
                - notice: str
        """
        cleaned_query = (query or "").strip()
        if not cleaned_query:
            return {
                "query": "",
                "total_results": 0,
                "results": [],
                "notice": "Empty query provided. Please submit a specific clinical or immunization question."
            }

        try:
            collection = self._get_collection()
            count = collection.count()
            if count == 0:
                return {
                    "query": cleaned_query,
                    "total_results": 0,
                    "results": [],
                    "notice": "Knowledge base collection is empty. Run ingestion script to index guideline documents."
                }

            # Build metadata filter if specified
            where_filter: Optional[Dict[str, Any]] = None
            conditions = []
            if vaccine_topic and vaccine_topic != "ALL":
                conditions.append({"vaccine_topic": vaccine_topic})
            if country_region and country_region != "ALL":
                conditions.append({"country_region": country_region})

            if len(conditions) == 1:
                where_filter = conditions[0]
            elif len(conditions) > 1:
                where_filter = {"$and": conditions}

            # Query ChromaDB (ChromaDB calculates embedding automatically using its embedding function)
            n_results = min(top_k, count)
            query_args: Dict[str, Any] = {
                "query_texts": [cleaned_query],
                "n_results": n_results,
                "include": ["documents", "metadatas", "distances"]
            }
            if where_filter:
                query_args["where"] = where_filter

            response = collection.query(**query_args)

            results: List[Dict[str, Any]] = []

            if response and response.get("ids") and len(response["ids"]) > 0:
                doc_ids = response["ids"][0]
                documents = response["documents"][0]
                metadatas = response["metadatas"][0]
                distances = response["distances"][0] if "distances" in response and response["distances"] else [0.0] * len(doc_ids)

                for idx, (cid, doc, meta, dist) in enumerate(zip(doc_ids, documents, metadatas, distances)):
                    # Compute approximate similarity score from L2 / cosine distance
                    score = round(max(0.0, 1.0 - (dist / 2.0)), 4)

                    if similarity_threshold and score < similarity_threshold:
                        continue

                    results.append({
                        "chunk_id": cid,
                        "text": doc,
                        "similarity_score": score,
                        "distance": round(float(dist), 4),
                        "rank": idx + 1,
                        "metadata": {
                            "title": meta.get("title", ""),
                            "organization": meta.get("organization", ""),
                            "source": meta.get("source", ""),
                            "publication_date": meta.get("publication_date", ""),
                            "page_section": meta.get("page_section", ""),
                            "country_region": meta.get("country_region", ""),
                            "vaccine_topic": meta.get("vaccine_topic", ""),
                            "document_version": meta.get("document_version", ""),
                            "source_file": meta.get("source_file", ""),
                        }
                    })

            return {
                "query": cleaned_query,
                "total_results": len(results),
                "results": results,
                "notice": "DEMO Verified Knowledge Base Retrieval. All sources strictly cited."
            }

        except Exception as e:
            logger.error(f"Error during RAG retrieval: {e}")
            return {
                "query": cleaned_query,
                "total_results": 0,
                "results": [],
                "error": str(e),
                "notice": "An error occurred during vector retrieval."
            }

    def get_stats(self) -> Dict[str, Any]:
        """Return collection overview and statistics."""
        try:
            collection = self._get_collection()
            count = collection.count()
            sample = collection.get(limit=50, include=["metadatas"])
            
            topics = set()
            organizations = set()
            sources = set()
            if sample and sample.get("metadatas"):
                for m in sample["metadatas"]:
                    if m.get("vaccine_topic"):
                        topics.add(m["vaccine_topic"])
                    if m.get("organization"):
                        organizations.add(m["organization"])
                    if m.get("source_file"):
                        sources.add(m["source_file"])

            return {
                "status": "healthy",
                "collection_name": collection.name,
                "total_chunks": count,
                "unique_topics": sorted(list(topics)),
                "unique_organizations": sorted(list(organizations)),
                "indexed_files": sorted(list(sources)),
                "vector_db": "ChromaDB"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }


rag_retriever = KnowledgeRetrieverService()
