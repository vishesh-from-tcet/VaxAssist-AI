# VaxAssist AI - Smart Immunization Companion

[![Phase](https://img.shields.io/badge/Phase-1%20Foundation-teal.svg)](https://github.com/vaxassist)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB.svg)](https://react.dev)
[![Docker](https://img.shields.io/badge/Database-MongoDB%20%2B%20ChromaDB-2496ED.svg)](https://www.docker.com)

**VaxAssist AI** is a final-year engineering healthcare project designed to assist families with smart immunization tracking, deterministic vaccine schedules, and AI-enabled medical guidance.

---

## 🏗️ Architecture & Component Isolation

- **Primary Storage (MongoDB)**: Stores user profiles, family members, vaccination history, schedules, and reminder configurations.
- **Vector Storage (ChromaDB)**: Dedicated exclusively to RAG knowledge base embeddings (immunization manuals, FAQs, vaccine sheets). **Patient health records are never stored in ChromaDB.**
- **Deterministic Schedule Engine**: Vaccine due dates and intervals are calculated strictly by deterministic Python rules. The LLM is never used for schedule calculations.
- **Offline & PWA**: Frontend utilizes Dexie.js for IndexedDB caching and `vite-plugin-pwa` for service worker offline support.
- **Secret Isolation**: All API keys reside strictly in backend environment configurations (`.env`). Secrets are never exposed to React client code.

---

## 📁 Repository Structure

```
VaxAssist-AI/
├── frontend/               # React + TypeScript + Vite + Tailwind CSS + Dexie + PWA
│   ├── src/
│   │   ├── components/     # UI Shell, Navigation, Layout
│   │   ├── db/             # Dexie.js IndexedDB schema definition
│   │   ├── pages/          # 12 Placeholder page routes
│   │   ├── services/       # Health API callers
│   │   └── test/           # Vitest suite
│   ├── vite.config.ts
│   └── package.json
├── backend/                # Python FastAPI server
│   ├── app/
│   │   ├── api/            # Health check endpoints (/health, /health/database, /health/vector-db)
│   │   ├── core/           # Pydantic BaseSettings & CORS configuration
│   │   ├── db/             # Motor MongoDB & ChromaDB client managers
│   │   ├── services/       # AI/RAG LLM & Embedding provider abstractions
│   │   └── main.py         # FastAPI application entry point
│   ├── tests/              # Pytest backend health test suite
│   └── requirements.txt
├── knowledge_base/         # RAG knowledge base raw document storage
│   ├── guidelines/
│   ├── vaccines/
│   ├── schedules/
│   └── faqs/
├── scripts/                # Helper scripts
├── docs/                   # Architecture blueprints & documentation
├── tests/                  # Integration test suite
├── docker-compose.yml      # MongoDB (27017) & ChromaDB (8001) containers
├── .env.example            # Environment template
├── .gitignore              # Ignores secrets, build files, venv, caches
└── README.md
```

---

## 🚀 Quick Setup Guide

### 1. Prerequisites
- **Node.js**: v18.0+ / v20.0+
- **Python**: v3.11 / v3.12
- **Docker Desktop**: Running

### 2. Environment Setup
Copy `.env.example` to `.env` in the root:
```bash
cp .env.example .env
```

### 3. Start Database Infrastructure (Docker)
Launch MongoDB and ChromaDB containers:
```bash
docker compose up -d
```
Verify container status:
```bash
docker compose ps
```

### 4. Setup Backend (FastAPI)
Create virtual environment and install dependencies:
```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
```

Run backend test suite:
```bash
pytest
```

Start backend development server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Setup Frontend (React + Vite)
In a new terminal:
```bash
cd frontend
npm install
```

Run frontend test suite:
```bash
npm test
```

Start frontend dev server:
```bash
npm run dev
```

Build production bundle:
```bash
npm run build
```

---

## 🩺 Health Check Endpoints

| Endpoint | Description | Expected Status |
| :--- | :--- | :--- |
| `GET /health` | Backend service & API status | `200 OK` (`status: "ok"`) |
| `GET /health/database` | MongoDB connectivity check | `200 OK` (`status: "healthy"`) |
| `GET /health/vector-db` | ChromaDB vector database check | `200 OK` (`status: "healthy"`) |

---

## 🗺️ Registered Frontend Routes (Phase 1 Placeholders)

- `/` - Home Landing Page
- `/login` - Login Shell
- `/register` - Registration Shell
- `/dashboard` - System Status Dashboard
- `/family` - Family Member Profiles
- `/vaccinations` - Vaccination Records Log
- `/schedule` - Immunization Schedule Timeline
- `/reminders` - Notifications & Reminders
- `/ai` - RAG Assistant Interface Shell
- `/reports` - PDF & Compliance Export
- `/profile` - User Profile Settings
- `/settings` - Platform & Local Storage Settings
