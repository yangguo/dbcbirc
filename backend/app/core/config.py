from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "CBIRC Analysis API"
    VERSION: str = "1.0.0"
    
    # CORS Settings
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"]
    
    # Database Settings
    MONGO_DB_URL: str = os.getenv("MONGO_DB_URL", "mongodb://localhost:27017/")
    DATABASE_NAME: str = "cbirc_analysis"
    
    # External APIs
    DIFY_API_KEY: str = os.getenv("DIFY_API_KEY", "")
    DIFY_API_URL: str = os.getenv("DIFY_API_URL", "")
    
    # File Storage
    DATA_FOLDER: str = "cbirc"
    
    class Config:
        env_file = ".env"


settings = Settings()