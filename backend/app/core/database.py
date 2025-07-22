from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import pandas as pd
from typing import Optional, List, Dict, Any
from app.core.config import settings


class DatabaseManager:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.sync_client: Optional[MongoClient] = None
        
    async def connect_db(self):
        """Create database connection"""
        self.client = AsyncIOMotorClient(settings.MONGO_DB_URL)
        self.sync_client = MongoClient(settings.MONGO_DB_URL)
        
    async def close_db(self):
        """Close database connection"""
        if self.client:
            self.client.close()
        if self.sync_client:
            self.sync_client.close()
            
    def get_collection(self, collection_name: str):
        """Get collection from database"""
        if not self.client:
            raise Exception("Database not connected")
        db = self.client[settings.DATABASE_NAME]
        return db[collection_name]
    
    def get_sync_collection(self, collection_name: str):
        """Get sync collection from database"""
        if not self.sync_client:
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