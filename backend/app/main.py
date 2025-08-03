from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.v1 import cases, search, analytics, admin, classification
from app.core.config import settings
from app.core.database import db_manager
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()  # This will output to console
    ]
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await db_manager.connect_db()
    except Exception as e:
        print(f"Database connection failed: {e}")
        print("Application will continue without database")
    yield
    # Shutdown
    await db_manager.close_db()


app = FastAPI(
    title="CBIRC Analysis API",
    description="API for CBIRC regulatory penalty analysis system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(cases.router, prefix="/api/v1/cases", tags=["cases"])
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(classification.router, prefix="/api/v1/classification", tags=["classification"])

@app.get("/")
async def root():
    return {"message": "CBIRC Analysis API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}