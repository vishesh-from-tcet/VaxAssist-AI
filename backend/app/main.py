from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongo import mongo_db
from app.api.health import router as health_router

logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("vaxassist")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing VaxAssist AI Backend Foundation...")
    mongo_db.connect()
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


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API Foundation",
        "health_check": "/health",
        "docs": "/docs"
    }
