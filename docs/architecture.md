# VaxAssist AI - System Architecture Blueprint

## Architectural Principles

1. **Separation of Concerns & Primary Storage**:
   - **MongoDB**: Primary database for all application domain data (users, family profiles, vaccination history, schedules, reminder configurations).
   - **ChromaDB**: Dedicated vector database exclusively for RAG (Retrieval-Augmented Generation) knowledge base embeddings (guidelines, vaccine information, FAQs). **NEVER store patient medical records in ChromaDB.**

2. **Deterministic Schedule Engine**:
   - Vaccine scheduling and due-date calculations **MUST** be performed by deterministic Python algorithms based on official medical schedules (e.g., UIP / WHO guidelines).
   - The LLM acts purely as an interactive assistant and context provider. The LLM **NEVER** generates or overrides schedule calculations.

3. **Secrets & Security**:
   - All secrets (API keys, DB credentials) reside strictly in the backend `.env`.
   - The React frontend communicates with the FastAPI backend over REST API endpoints and NEVER holds API keys directly.

4. **Modular Architecture**:
   - Clear decoupling of API routers, database managers, AI services, and frontend modules so features can be integrated independently without structural refactoring.
