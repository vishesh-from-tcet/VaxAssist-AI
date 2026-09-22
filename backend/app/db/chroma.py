import os
import logging
from typing import Dict, Any, Optional
import httpx
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions
from app.core.config import settings

logger = logging.getLogger(__name__)

KNOWLEDGE_COLLECTION_NAME = "vaxassist_knowledge_base"
DEFAULT_PERSIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "chroma")


class ChromaDBManager:
    _client = None
    _collection = None

    def get_client(self):
        if self._client is None:
            # 1. Try connecting to standalone ChromaDB server via HttpClient
            try:
                client = chromadb.HttpClient(
                    host=settings.CHROMADB_HOST,
                    port=settings.CHROMADB_PORT
                )
                # Test heartbeat to verify connection is actually active
                client.heartbeat()
                self._client = client
                logger.info(f"Connected to ChromaDB HttpClient at {settings.CHROMADB_HOST}:{settings.CHROMADB_PORT}")
            except Exception as e:
                # 2. Fall back to local PersistentClient for embedded / standalone reliability
                os.makedirs(DEFAULT_PERSIST_DIR, exist_ok=True)
                self._client = chromadb.PersistentClient(path=DEFAULT_PERSIST_DIR)
                logger.info(f"ChromaDB standalone server unavailable ({e}). Using PersistentClient at {DEFAULT_PERSIST_DIR}")

        return self._client

    @property
    def client(self):
        return self.get_client()

    def get_or_create_knowledge_collection(self, reset: bool = False):
        """Get or recreate the vector collection for verified vaccination knowledge."""
        client = self.get_client()
        if reset:
            try:
                client.delete_collection(name=KNOWLEDGE_COLLECTION_NAME)
                logger.info(f"Deleted existing ChromaDB collection: {KNOWLEDGE_COLLECTION_NAME}")
            except Exception:
                pass

        # Using default all-MiniLM-L6-v2 embedding function
        default_ef = embedding_functions.DefaultEmbeddingFunction()

        collection = client.get_or_create_collection(
            name=KNOWLEDGE_COLLECTION_NAME,
            embedding_function=default_ef,
            metadata={"description": "Verified Vaccination and Medical Knowledge RAG Vector Store"}
        )
        self._collection = collection
        return collection


chroma_db = ChromaDBManager()


async def check_chroma_connection() -> Dict[str, Any]:
    url_v2 = f"http://{settings.CHROMADB_HOST}:{settings.CHROMADB_PORT}/api/v2/heartbeat"
    url_v1 = f"http://{settings.CHROMADB_HOST}:{settings.CHROMADB_PORT}/api/v1/heartbeat"
    try:
        async with httpx.AsyncClient(timeout=2.0) as http_client:
            # Try v2 first
            response = await http_client.get(url_v2)
            if response.status_code != 200:
                response = await http_client.get(url_v1)

            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "mode": "standalone_http",
                    "host": settings.CHROMADB_HOST,
                    "port": settings.CHROMADB_PORT,
                    "response": response.json()
                }
    except Exception:
        pass

    # Fallback to persistent client check
    try:
        client = chroma_db.get_client()
        client.heartbeat()
        return {
            "status": "healthy",
            "mode": "persistent_embedded",
            "path": DEFAULT_PERSIST_DIR,
            "collection": KNOWLEDGE_COLLECTION_NAME
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
