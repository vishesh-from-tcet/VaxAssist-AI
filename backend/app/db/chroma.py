import logging
from typing import Dict, Any
import httpx
import chromadb
from app.core.config import settings

logger = logging.getLogger(__name__)

class ChromaDBManager:
    _client = None

    @property
    def client(self):
        if self._client is None:
            try:
                self._client = chromadb.HttpClient(
                    host=settings.CHROMADB_HOST,
                    port=settings.CHROMADB_PORT
                )
            except Exception as e:
                logger.warning(f"Could not instantiate ChromaDB HttpClient: {e}")
        return self._client

chroma_db = ChromaDBManager()

async def check_chroma_connection() -> Dict[str, Any]:
    url_v2 = f"http://{settings.CHROMADB_HOST}:{settings.CHROMADB_PORT}/api/v2/heartbeat"
    url_v1 = f"http://{settings.CHROMADB_HOST}:{settings.CHROMADB_PORT}/api/v1/heartbeat"
    try:
        async with httpx.AsyncClient(timeout=3.0) as http_client:
            # Try v2 first
            response = await http_client.get(url_v2)
            if response.status_code != 200:
                response = await http_client.get(url_v1)
            
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "host": settings.CHROMADB_HOST,
                    "port": settings.CHROMADB_PORT,
                    "response": response.json()
                }
            else:
                return {
                    "status": "unhealthy",
                    "host": settings.CHROMADB_HOST,
                    "port": settings.CHROMADB_PORT,
                    "status_code": response.status_code
                }
    except Exception as e:
        logger.error(f"ChromaDB health check failed: {e}")
        return {
            "status": "unhealthy",
            "host": settings.CHROMADB_HOST,
            "port": settings.CHROMADB_PORT,
            "error": str(e)
        }
