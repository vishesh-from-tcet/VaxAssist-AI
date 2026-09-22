from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Abstract base class for LLM providers (Gemini, Claude, OpenAI, Local, etc.)."""

    @abstractmethod
    async def generate_response(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Generate a response text from the LLM model."""
        pass

    @abstractmethod
    def get_provider_info(self) -> Dict[str, Any]:
        """Return provider metadata."""
        pass


class EmbeddingProvider(ABC):
    """Abstract base class for text embedding providers for ChromaDB vector store."""

    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding vector for a single string."""
        pass

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embedding vectors for multiple strings."""
        pass


class GeminiLLMProvider(LLMProvider):
    """Google Gemini LLM provider implementation shell."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
        self._is_configured = bool(self.api_key and self.api_key != "your_gemini_api_key_here")

    async def generate_response(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        if not self._is_configured:
            logger.warning("Gemini API key is not configured. Returning shell placeholder.")
            return "[Gemini Provider Shell] API Key not configured in environment."
        
        # Placeholder for Gemini SDK call when key is provided
        return f"[Gemini Response Shell for model {self.model_name}] Received prompt length: {len(prompt)}"

    def get_provider_info(self) -> Dict[str, Any]:
        return {
            "provider": "google_gemini",
            "model": self.model_name,
            "configured": self._is_configured
        }


class DefaultEmbeddingProvider(EmbeddingProvider):
    """Default embedding provider abstraction shell."""

    async def embed_text(self, text: str) -> List[float]:
        # Return dummy 384-dim placeholder embedding vector for foundation phase
        return [0.0] * 384

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [[0.0] * 384 for _ in texts]
