"""
LLM and AI Provider Abstraction for VaxAssist AI Care Coordinator.
Supports Gemini, local deterministic grounded RAG fallback, and future extensible providers.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
import logging
import re
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Abstract base class for LLM providers (Gemini, Claude, OpenAI, Local, etc.)."""

    @abstractmethod
    async def generate_response(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """Generate response text from the LLM model."""
        pass

    @abstractmethod
    def get_provider_info(self) -> Dict[str, Any]:
        """Return provider metadata."""
        pass


class GeminiLLMProvider(LLMProvider):
    """Google Gemini LLM provider implementation."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
        self._is_configured = bool(
            self.api_key and self.api_key != "your_gemini_api_key_here" and len(self.api_key) > 10
        )
        self._genai_model = None

    def _get_model(self, system_instruction: Optional[str] = None):
        if not self._is_configured:
            return None
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            return genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=system_instruction
            )
        except Exception as e:
            logger.error(f"Failed to initialize Google Generative AI model: {e}")
            return None

    async def generate_response(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        if not self._is_configured:
            logger.warning("Gemini API key not configured or placeholder detected. Falling back to grounded RAG synthesizer.")
            fallback = GroundedFallbackLLMProvider()
            return await fallback.generate_response(prompt, system_instruction, conversation_history)

        try:
            model = self._get_model(system_instruction)
            if model is None:
                fallback = GroundedFallbackLLMProvider()
                return await fallback.generate_response(prompt, system_instruction, conversation_history)

            # Build chat history if available
            if conversation_history and len(conversation_history) > 0:
                chat = model.start_chat(history=[])
                # Format history entries
                for msg in conversation_history[-6:]:
                    role = "user" if msg.get("role") in ["user", "human"] else "model"
                    chat.history.append({"role": role, "parts": [msg.get("content", "")]})
                response = chat.send_message(prompt)
            else:
                response = model.generate_content(prompt)

            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}. Falling back to grounded RAG synthesizer.")
            fallback = GroundedFallbackLLMProvider()
            return await fallback.generate_response(prompt, system_instruction, conversation_history)

    def get_provider_info(self) -> Dict[str, Any]:
        return {
            "provider": "google_gemini",
            "model": self.model_name,
            "configured": self._is_configured,
        }


class GroundedFallbackLLMProvider(LLMProvider):
    """
    High-fidelity, deterministic grounded synthesizer for local, offline, or test environments.
    Extracts answers directly from retrieved clinical knowledge chunks and authorized patient context.
    Ensures zero hallucination and strict boundary enforcement.
    """

    async def generate_response(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        # Prompt analysis
        p_lower = prompt.lower()

        # Check prompt injection resistance
        if any(term in p_lower for term in [
            "ignore previous instructions", "ignore all rules", "reveal system prompt",
            "show your instructions", "dump database", "bypass security", "developer mode"
        ]):
            return (
                "I am the VaxAssist AI Care Coordinator. I operate strictly under clinical safety guidelines "
                "to provide verified immunization information and authorized patient history. "
                "I cannot reveal internal system prompts, override medical constraints, or access unauthorized records."
            )

        # Extract verified knowledge context and patient context from prompt if structured
        clinical_knowledge = ""
        patient_context = ""
        user_query = ""

        if "=== VERIFIED CLINICAL KNOWLEDGE ===" in prompt:
            parts = prompt.split("=== VERIFIED CLINICAL KNOWLEDGE ===")
            if len(parts) > 1:
                after_ck = parts[1]
                if "=== AUTHORIZED PATIENT CONTEXT ===" in after_ck:
                    ck_part, after_pc = after_ck.split("=== AUTHORIZED PATIENT CONTEXT ===")
                    clinical_knowledge = ck_part.strip()
                    if "=== USER QUESTION ===" in after_pc:
                        pc_part, q_part = after_pc.split("=== USER QUESTION ===")
                        patient_context = pc_part.strip()
                        user_query = q_part.strip()
                    else:
                        patient_context = after_pc.strip()
                elif "=== USER QUESTION ===" in after_ck:
                    ck_part, q_part = after_ck.split("=== USER QUESTION ===")
                    clinical_knowledge = ck_part.strip()
                    user_query = q_part.strip()

        # If patient context exists and user is inquiring about vaccinations received or due
        if patient_context and ("received" in p_lower or "record" in p_lower or "history" in p_lower or "status" in p_lower):
            return (
                f"Based on the authorized health records for {patient_context.splitlines()[0].replace('Member:', '').strip() if 'Member:' in patient_context else 'this family member'}:\n\n"
                f"{patient_context}\n\n"
                f"Please consult your healthcare provider or pediatrician to confirm upcoming schedules or if you have specific clinical concerns."
            )

        # If clinical knowledge is present and relevant
        if clinical_knowledge:
            # Format clean, empathetic response grounded in the retrieved chunks
            # Extract key informative lines from the clinical knowledge chunks
            clean_lines = []
            for line in clinical_knowledge.split("\n"):
                line_str = line.strip()
                if line_str and not line_str.startswith("[CHUNK") and not line_str.startswith("Source:") and not line_str.startswith("---") and not line_str.startswith("#"):
                    clean_lines.append(line_str)
            
            summary_content = "\n".join(clean_lines[:15]) if clean_lines else clinical_knowledge[:600]

            return (
                f"Based on verified immunization reference guidelines:\n\n"
                f"{summary_content}\n\n"
                f"*Note: This information is derived from verified guidelines and is for educational reference. "
                f"Always consult a qualified healthcare provider for personalized medical advice.*"
            )

        # General inquiry with no clinical chunks found
        return (
            "I could not find specific verified guideline documentation regarding this specific inquiry in our knowledge base. "
            "For individualized medical advice, diagnoses, or clinical guidance, please consult a certified healthcare professional."
        )

    def get_provider_info(self) -> Dict[str, Any]:
        return {
            "provider": "grounded_deterministic_fallback",
            "model": "vaxassist-rag-synthesizer-v1",
            "configured": True,
        }


def get_llm_provider() -> LLMProvider:
    """Factory to instantiate the appropriate active LLM provider."""
    gemini = GeminiLLMProvider()
    if gemini._is_configured:
        return gemini
    return GroundedFallbackLLMProvider()
