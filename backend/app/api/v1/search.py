from fastapi import APIRouter, HTTPException
from app.models.case import CaseSearchRequest, CaseSearchResponse
from app.services.case_service import case_service

router = APIRouter()


@router.post("/", response_model=CaseSearchResponse)
async def search_cases(search_request: CaseSearchRequest):
    """Search cases based on criteria"""
    try:
        return await case_service.search_cases(search_request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
async def get_search_suggestions():
    """Get search suggestions for autocomplete"""
    try:
        # Get unique values for suggestions
        detail_df = await case_service.get_case_detail("")
        category_df = await case_service.get_case_categories()
        
        suggestions = {
            "provinces": [],
            "industries": [],
            "organizations": [],
            "laws": []
        }
        
        if not category_df.empty:
            if "province" in category_df.columns:
                suggestions["provinces"] = category_df["province"].dropna().unique().tolist()
            if "industry" in category_df.columns:
                suggestions["industries"] = category_df["industry"].dropna().unique().tolist()
            if "org" in category_df.columns:
                suggestions["organizations"] = category_df["org"].dropna().unique().tolist()
            if "law" in category_df.columns:
                suggestions["laws"] = category_df["law"].dropna().unique().tolist()
        
        return suggestions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))