from fastapi import APIRouter, HTTPException
from typing import List
from app.models.case import MonthlyTrend, RegionalStats
from app.services.case_service import case_service

router = APIRouter()


@router.get("/monthly-trends", response_model=List[MonthlyTrend])
async def get_monthly_trends():
    """Get monthly trend data for charts"""
    try:
        return await case_service.get_monthly_trends()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/regional-stats", response_model=List[RegionalStats])
async def get_regional_statistics():
    """Get regional statistics for charts"""
    try:
        return await case_service.get_regional_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/csv")
async def export_cases_csv():
    """Export cases to CSV format"""
    try:
        from fastapi.responses import StreamingResponse
        import io
        
        # Get all case data
        df = await case_service.get_case_detail("")
        
        if df.empty:
            raise HTTPException(status_code=404, detail="No data to export")
        
        # Create CSV stream
        stream = io.StringIO()
        df.to_csv(stream, index=False, encoding='utf-8-sig')
        stream.seek(0)
        
        return StreamingResponse(
            io.BytesIO(stream.getvalue().encode('utf-8-sig')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=cbirc_cases.csv"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary-report")
async def get_summary_report():
    """Get comprehensive summary report"""
    try:
        stats = await case_service.get_case_stats()
        monthly_trends = await case_service.get_monthly_trends()
        regional_stats = await case_service.get_regional_stats()
        
        # Calculate additional insights
        insights = {
            "peak_month": "",
            "top_province": "",
            "avg_monthly_cases": 0,
            "growth_trend": "stable"
        }
        
        if monthly_trends:
            # Find peak month
            peak_month_data = max(monthly_trends, key=lambda x: x.count)
            insights["peak_month"] = peak_month_data.month
            
            # Calculate average monthly cases
            total_months = len(monthly_trends)
            if total_months > 0:
                insights["avg_monthly_cases"] = sum(t.count for t in monthly_trends) / total_months
            
            # Simple growth trend analysis
            if len(monthly_trends) >= 2:
                recent_avg = sum(t.count for t in monthly_trends[-3:]) / min(3, len(monthly_trends))
                earlier_avg = sum(t.count for t in monthly_trends[:3]) / min(3, len(monthly_trends))
                
                if recent_avg > earlier_avg * 1.1:
                    insights["growth_trend"] = "increasing"
                elif recent_avg < earlier_avg * 0.9:
                    insights["growth_trend"] = "decreasing"
        
        if regional_stats:
            # Find top province
            top_province_data = max(regional_stats, key=lambda x: x.count)
            insights["top_province"] = top_province_data.province
        
        return {
            "stats": stats,
            "monthly_trends": monthly_trends,
            "regional_stats": regional_stats,
            "insights": insights
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))