from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
import io
import pandas as pd
from app.models.case import MonthlyTrend, RegionalStats, CaseSearchRequest
from app.services.case_service import case_service

router = APIRouter()


@router.get("/test")
async def test_analytics():
    """Test endpoint to verify analytics router is working"""
    return {"message": "Analytics router is working", "status": "ok"}


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
async def export_cases_csv(
    # Pagination
    page: Optional[int] = Query(None),
    page_size: Optional[int] = Query(None),
    
    # Date filters
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    date_start: Optional[str] = Query(None),
    date_end: Optional[str] = Query(None),
    
    # Text filters
    title_text: Optional[str] = Query(None),
    wenhao_text: Optional[str] = Query(None),
    people_text: Optional[str] = Query(None),
    event_text: Optional[str] = Query(None),
    law_text: Optional[str] = Query(None),
    penalty_text: Optional[str] = Query(None),
    org_text: Optional[str] = Query(None),
    
    # Other filters
    industry: Optional[str] = Query(None),
    province: Optional[str] = Query(None),
    min_penalty: Optional[float] = Query(None),
    keyword: Optional[str] = Query(None),
    org_name: Optional[str] = Query(None),
):
    """Export cases to CSV format with optional search filters"""
    try:
        print(f"Export CSV called with filters: people_text={people_text}, min_penalty={min_penalty}")
        
        # Check if any filters are provided (no need to create CaseSearchRequest)
        has_filters = any([
            start_date, end_date, date_start, date_end,
            title_text, wenhao_text, people_text, event_text, law_text, penalty_text, org_text,
            industry, province, min_penalty, keyword, org_name
        ])
        
        print(f"Has filters: {has_filters}")
        
        if has_filters:
            # For export, bypass the pagination limits by directly calling case service methods
            # Get the data directly without going through CaseSearchRequest pagination
            
            # Get combined data
            detail_df = await case_service.get_case_detail(org_name or "")
            if detail_df.empty and org_name:
                detail_df = await case_service.get_case_detail("")
            
            analysis_df = await case_service.get_case_analysis(org_name or "")
            category_df = await case_service.get_case_categories()
            
            if detail_df.empty:
                df = pd.DataFrame(columns=[
                    'id', 'title', 'subtitle', 'publish_date', 'content', 'summary',
                    'wenhao', 'people', 'event', 'law', 'penalty', 'org',
                    'penalty_date', 'category', 'amount', 'province', 'industry'
                ])
            else:
                # Merge dataframes
                merged_df = detail_df.copy()
                if not analysis_df.empty:
                    merged_df = pd.merge(merged_df, analysis_df, on="id", how="left")
                if not category_df.empty:
                    merged_df = pd.merge(merged_df, category_df, on="id", how="left")
                
                # Apply filters directly to the DataFrame using the same logic as search
                filtered_df = merged_df.copy()
                
                # Helper function for text filtering (same as case_service)
                def split_words(text: str) -> str:
                    """Split string by space into words, add regex patterns"""
                    if not text:
                        return ""
                    words = text.split()
                    words = ["(?=.*" + word + ")" for word in words]
                    return "".join(words)
                
                # Apply date filters
                if start_date:
                    filtered_df = filtered_df[filtered_df['发布日期'] >= start_date]
                if end_date:
                    filtered_df = filtered_df[filtered_df['发布日期'] <= end_date]
                
                # Apply text filters using same logic as search
                text_filters = [
                    ("wenhao", wenhao_text),
                    ("people", people_text),
                    ("event", event_text),
                    ("law", law_text),
                    ("penalty", penalty_text),
                    ("org", org_text),
                    ("industry", industry),
                    ("province", province),
                ]
                
                for column, text in text_filters:
                    if text and column in filtered_df.columns:
                        pattern = split_words(text)
                        if pattern:
                            filtered_df = filtered_df[
                                filtered_df[column].astype(str).str.contains(pattern, case=False, na=False, regex=True)
                            ]
                
                # Title filter
                if title_text and "标题" in filtered_df.columns:
                    title_pattern = split_words(title_text)
                    if title_pattern:
                        filtered_df = filtered_df[
                            filtered_df["标题"].astype(str).str.contains(title_pattern, case=False, na=False, regex=True)
                        ]
                
                # Amount filter
                if min_penalty and min_penalty > 0 and "amount" in filtered_df.columns:
                    filtered_df = filtered_df[
                        pd.to_numeric(filtered_df["amount"], errors='coerce').fillna(0) >= min_penalty
                    ]
                
                # General keyword filter across multiple fields
                if keyword:
                    keyword_pattern = split_words(keyword)
                    if keyword_pattern:
                        candidate_columns = [
                            "标题", "文号", "内容", "wenhao", "people", "event",
                            "law", "penalty", "org", "province", "industry", "category"
                        ]
                        existing_columns = [c for c in candidate_columns if c in filtered_df.columns]
                        if existing_columns:
                            mask = pd.Series(False, index=filtered_df.index)
                            for col in existing_columns:
                                mask = mask | filtered_df[col].astype(str).str.contains(keyword_pattern, case=False, na=False, regex=True)
                            filtered_df = filtered_df[mask]
                
                # Sort by date descending (same as search)
                if "发布日期" in filtered_df.columns and filtered_df["发布日期"].notna().any():
                    filtered_df = filtered_df.sort_values(["发布日期", "id"], ascending=[False, False])
                elif "id" in filtered_df.columns:
                    filtered_df = filtered_df.sort_values("id", ascending=False)
                
                # Remove duplicates (same as search)
                if "id" in filtered_df.columns:
                    filtered_df = filtered_df.drop_duplicates(subset=["id"])
                
                filtered_df = filtered_df.reset_index(drop=True)
                
                print(f"Filtered DataFrame: {len(filtered_df)} rows")
                
                # Convert to export format
                if not filtered_df.empty:
                    df = pd.DataFrame({
                        'id': filtered_df['id'].astype(str) if 'id' in filtered_df.columns else '',
                        'title': filtered_df['标题'].astype(str) if '标题' in filtered_df.columns else '',
                        'subtitle': filtered_df['文号'].astype(str) if '文号' in filtered_df.columns else '',
                        'publish_date': filtered_df['发布日期'].astype(str) if '发布日期' in filtered_df.columns else '',
                        'content': filtered_df['内容'].astype(str) if '内容' in filtered_df.columns else '',
                        'summary': filtered_df['summary'].astype(str) if 'summary' in filtered_df.columns else '',
                        'wenhao': filtered_df['wenhao'].astype(str) if 'wenhao' in filtered_df.columns else '',
                        'people': filtered_df['people'].astype(str) if 'people' in filtered_df.columns else '',
                        'event': filtered_df['event'].astype(str) if 'event' in filtered_df.columns else '',
                        'law': filtered_df['law'].astype(str) if 'law' in filtered_df.columns else '',
                        'penalty': filtered_df['penalty'].astype(str) if 'penalty' in filtered_df.columns else '',
                        'org': filtered_df['org'].astype(str) if 'org' in filtered_df.columns else '',
                        'penalty_date': filtered_df['penalty_date'].astype(str) if 'penalty_date' in filtered_df.columns else '',
                        'category': filtered_df['category'].astype(str) if 'category' in filtered_df.columns else '',
                        'amount': pd.to_numeric(filtered_df['amount'], errors='coerce').fillna(0) if 'amount' in filtered_df.columns else 0,
                        'province': filtered_df['province'].astype(str) if 'province' in filtered_df.columns else '',
                        'industry': filtered_df['industry'].astype(str) if 'industry' in filtered_df.columns else '',
                    })
                else:
                    df = pd.DataFrame(columns=[
                        'id', 'title', 'subtitle', 'publish_date', 'content', 'summary',
                        'wenhao', 'people', 'event', 'law', 'penalty', 'org',
                        'penalty_date', 'category', 'amount', 'province', 'industry'
                    ])
        else:
            # Get all case data when no filters
            print("Getting all case data")
            df = await case_service.get_case_detail("")
        
        print(f"DataFrame shape: {df.shape}")
        
        if df.empty:
            raise HTTPException(status_code=404, detail="No data to export")
        
        # Create CSV stream
        stream = io.StringIO()
        df.to_csv(stream, index=False, encoding='utf-8-sig')
        stream.seek(0)
        
        print("CSV generated successfully")
        
        return StreamingResponse(
            io.BytesIO(stream.getvalue().encode('utf-8-sig')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=cbirc_cases.csv"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Export error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


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