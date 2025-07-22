from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.models.case import CaseDetail, CaseSummary, CaseStats, OrganizationType
from app.services.case_service import case_service

router = APIRouter()


@router.get("/stats", response_model=CaseStats)
async def get_case_statistics():
    """Get overall case statistics"""
    try:
        return await case_service.get_case_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_case_summary(
    org_name: Optional[str] = Query(None, description="Organization name")
):
    """Get case summary data"""
    try:
        df = await case_service.get_case_summary(org_name or "")
        return {
            "total": len(df),
            "data": df.to_dict("records") if not df.empty else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/detail")
async def get_case_detail(
    org_name: Optional[str] = Query(None, description="Organization name")
):
    """Get case detail data"""
    try:
        df = await case_service.get_case_detail(org_name or "")
        return {
            "total": len(df),
            "data": df.to_dict("records") if not df.empty else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}", response_model=CaseDetail)
async def get_case_by_id(case_id: str):
    """Get specific case by ID"""
    try:
        # Get all case details
        df = await case_service.get_case_detail("")
        analysis_df = await case_service.get_case_analysis("")
        category_df = await case_service.get_case_categories()
        
        # Find the specific case
        case_row = df[df["id"] == case_id]
        if case_row.empty:
            raise HTTPException(status_code=404, detail="Case not found")
        
        # Merge with additional data
        if not analysis_df.empty:
            analysis_row = analysis_df[analysis_df["id"] == case_id]
            if not analysis_row.empty:
                for col in analysis_row.columns:
                    if col != "id":
                        case_row[col] = analysis_row[col].iloc[0]
        
        if not category_df.empty:
            category_row = category_df[category_df["id"] == case_id]
            if not category_row.empty:
                for col in category_row.columns:
                    if col != "id":
                        case_row[col] = category_row[col].iloc[0]
        
        # Convert to CaseDetail model
        row = case_row.iloc[0]
        return CaseDetail(
            id=str(row.get("id", "")),
            title=str(row.get("标题", "")),
            subtitle=str(row.get("文号", "")),
            publish_date=row.get("发布日期"),
            content=str(row.get("内容", "")),
            summary=str(row.get("summary", "")),
            wenhao=str(row.get("wenhao", "")),
            people=str(row.get("people", "")),
            event=str(row.get("event", "")),
            law=str(row.get("law", "")),
            penalty=str(row.get("penalty", "")),
            org=str(row.get("org", "")),
            penalty_date=row.get("penalty_date"),
            category=str(row.get("category", "")),
            amount=float(row.get("amount", 0)) if row.get("amount") else 0,
            province=str(row.get("province", "")),
            industry=row.get("industry")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))