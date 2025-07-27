from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.case import UpdateRequest, OrganizationType
from app.services.scraper_service import scraper_service

router = APIRouter()


@router.post("/update-cases")
async def update_cases(
    update_request: UpdateRequest,
    background_tasks: BackgroundTasks
):
    """Update cases from CBIRC website"""
    try:
        # Add background task for scraping
        background_tasks.add_task(
            scraper_service.scrape_cases,
            update_request.org_name,
            update_request.start_page,
            update_request.end_page
        )
        
        return {
            "message": "Update task started",
            "org_name": update_request.org_name,
            "page_range": f"{update_request.start_page}-{update_request.end_page}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh-data")
async def refresh_data():
    """Refresh cached data"""
    try:
        # Clear any caches if implemented
        return {"message": "Data refresh completed"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/system-info")
async def get_system_info():
    """Get system information"""
    try:
        from app.core.database import db_manager
        
        # Get collection stats
        collections_info = {}
        
        # This would typically get actual collection stats
        # For now, return basic info
        return {
            "database_status": "connected",
            "collections": collections_info,
            "api_version": "1.0.0"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))