from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.mongo import check_mongo_connection
from app.db.chroma import check_chroma_connection

router = APIRouter(prefix="/health", tags=["Health Checks"])


@router.get("", summary="General Application Health Check")
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0-foundation"
    }


@router.get("/database", summary="MongoDB Health Check")
async def database_health_check():
    res = await check_mongo_connection()
    status_code = status.HTTP_200_OK if res.get("status") == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content=res)


@router.get("/vector-db", summary="ChromaDB Vector Store Health Check")
async def vector_db_health_check():
    res = await check_chroma_connection()
    status_code = status.HTTP_200_OK if res.get("status") == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content=res)
