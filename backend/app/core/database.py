from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import pandas as pd
from typing import Optional, List, Dict, Any
from app.core.config import settings


class DatabaseManager:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.sync_client: Optional[MongoClient] = None
        self._connection_enabled = not settings.DISABLE_DATABASE  # Use config setting
        
    def disable_auto_connection(self):
        """Disable automatic database connection"""
        self._connection_enabled = False
        
    def enable_auto_connection(self):
        """Enable automatic database connection"""
        self._connection_enabled = True
        
    async def connect_db(self):
        """Create database connection"""
        if not self._connection_enabled:
            print("Database connection disabled - skipping connection")
            return
        try:
            self.client = AsyncIOMotorClient(settings.MONGO_DB_URL)
            self.sync_client = MongoClient(settings.MONGO_DB_URL)
            print("Database connection established successfully")
        except Exception as e:
            print(f"Failed to connect to database: {e}")
            print("Application will continue without database connection")
        
    async def close_db(self):
        """Close database connection"""
        if self.client:
            self.client.close()
        if self.sync_client:
            self.sync_client.close()
            
    def get_collection(self, collection_name: str):
        """Get collection from database"""
        if not self.client:
            if not self._connection_enabled:
                raise Exception("Database connection is disabled")
            raise Exception("Database not connected")
        db = self.client[settings.DATABASE_NAME]
        return db[collection_name]
    
    def get_sync_collection(self, collection_name: str):
        """Get sync collection from database"""
        if not self.sync_client:
            if not self._connection_enabled:
                raise Exception("Database connection is disabled")
            raise Exception("Database not connected")
        db = self.sync_client[settings.DATABASE_NAME]
        return db[collection_name]
        
    async def insert_dataframe(self, df: pd.DataFrame, collection_name: str, batch_size: int = 10000):
        """Insert pandas DataFrame into MongoDB collection"""
        collection = self.get_collection(collection_name)
        records = df.to_dict("records")
        
        # Insert in batches
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            await collection.insert_many(batch)
            
    async def get_dataframe(self, collection_name: str, query: Dict[str, Any] = None) -> pd.DataFrame:
        """Get data from MongoDB collection as pandas DataFrame"""
        collection = self.get_collection(collection_name)
        query = query or {}
        
        cursor = collection.find(query)
        documents = await cursor.to_list(length=None)
        
        if documents:
            return pd.DataFrame(documents)
        return pd.DataFrame()
        
    async def delete_collection_data(self, collection_name: str):
        """Delete all data from collection"""
        collection = self.get_collection(collection_name)
        await collection.delete_many({})


# Global database manager instance
db_manager = DatabaseManager()