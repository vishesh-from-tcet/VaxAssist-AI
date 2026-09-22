from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongo import mongo_db
from app.api.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.families import router as families_router
from app.api.v1.vaccinations import router as vaccinations_router
from app.api.v1.schedule import router as schedule_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.ai_chat import router as ai_chat_router

logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("vaxassist")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing VaxAssist AI Backend Foundation...")
    mongo_db.connect()
    await mongo_db.init_db()
    yield
    logger.info("Shutting down VaxAssist AI Backend...")
    mongo_db.close()


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend Foundation API for VaxAssist AI Healthcare Platform",
    version="1.0.0-foundation",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(health_router)
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(auth_router)
app.include_router(families_router, prefix="/api/v1")
app.include_router(families_router)
app.include_router(vaccinations_router, prefix="/api/v1")
app.include_router(vaccinations_router)
app.include_router(schedule_router, prefix="/api/v1")
app.include_router(schedule_router)
app.include_router(knowledge_router, prefix="/api/v1")
app.include_router(knowledge_router)
app.include_router(ai_chat_router, prefix="/api/v1")
app.include_router(ai_chat_router)



@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API Foundation",
        "health_check": "/health",
        "docs": "/docs"
    }
