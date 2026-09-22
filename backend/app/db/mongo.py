import logging
from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger(__name__)

class MongoDBManager:
    client: AsyncIOMotorClient = None
    db = None

    def connect(self):
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}")
        self.client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=3000)
        self.db = self.client[settings.MONGODB_DB_NAME]

    async def init_db(self):
        """Initialize indexes for MongoDB collections."""
        if self.db is not None:
            try:
                await self.db.users.create_index("email", unique=True)
                await self.db.families.create_index("user_id")
                await self.db.members.create_index([("family_id", 1), ("user_id", 1)])
                await self.db.vaccinations.create_index([("user_id", 1), ("member_id", 1)])
                await self.db.vaccinations.create_index([("administration_date", -1)])
                logger.info("MongoDB indexes on users, families, members, and vaccinations ensured.")
            except Exception as e:
                logger.warning(f"Could not create MongoDB indexes: {e}")

    def close(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")


mongo_db = MongoDBManager()

async def check_mongo_connection() -> Dict[str, Any]:
    try:
        if mongo_db.client is None:
            mongo_db.connect()
        # Perform admin ping command
        await mongo_db.client.admin.command('ping')
        return {
            "status": "healthy",
            "database": settings.MONGODB_DB_NAME,
            "url": settings.MONGODB_URL.split("@")[-1]  # Sanitize auth if present
        }
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": settings.MONGODB_DB_NAME,
            "error": str(e)
        }
