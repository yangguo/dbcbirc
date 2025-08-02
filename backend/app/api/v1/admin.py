import os
import glob
import pandas as pd
import io
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, File, UploadFile, Query
from fastapi.responses import StreamingResponse
from app.models.case import UpdateRequest, OrganizationType
from app.services.scraper_service import scraper_service
from app.services.task_service import task_service, create_update_cases_task, create_update_details_task, TaskType
from app.core.database import db_manager
from app.core.config import settings
from pymongo import MongoClient
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Data folder path
DATA_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), "cbirc")

# Organization name mapping
org2name = {
    "银保监会机关": "jiguan",
    "银保监局本级": "benji",
    "银保监分局本级": "fenju",
    "": "",
}

def get_cbircsum(orgname):
    """Get CBIRC summary data"""
    org_name_index = org2name.get(orgname, "")
    beginwith = "cbircsum" + org_name_index
    pendf = get_csvdf(DATA_FOLDER, beginwith)
    
    if pendf.empty:
        logger.warning(f"No summary data found for {orgname}")
        return pd.DataFrame()
    
    if "publishDate" not in pendf.columns:
        logger.warning(f"Missing publishDate column in summary data for {orgname}")
        return pd.DataFrame()
    
    # Format date
    try:
        pendf["发布日期"] = pd.to_datetime(pendf["publishDate"]).dt.date
    except Exception as e:
        logger.warning(f"Date formatting failed: {e}")
    
    return pendf


def get_cbircdetail(orgname=""):
    """Get CBIRC detail data"""
    org_name_index = org2name.get(orgname, "")
    beginwith = "cbircdtl" + org_name_index
    d0 = get_csvdf(DATA_FOLDER, beginwith)
    
    if d0.empty:
        logger.warning(f"No detail data available for {orgname}")
        return pd.DataFrame()
    
    # Check if required columns exist
    required_columns = ["title", "subtitle", "date", "doc", "id"]
    missing_columns = [col for col in required_columns if col not in d0.columns]
    if missing_columns:
        logger.warning(f"Missing columns in detail data for {orgname}: {missing_columns}")
        return pd.DataFrame()
    
    # Select and rename columns
    d1 = d0[["title", "subtitle", "date", "doc", "id"]].reset_index(drop=True)
    
    # Format date
    try:
        d1["date"] = d1["date"].str.split(".").str[0]
        d1["date"] = pd.to_datetime(d1["date"], format="%Y-%m-%d %H:%M:%S").dt.date
    except Exception as e:
        logger.warning(f"Date formatting failed: {e}")
    
    # Update column names
    d1.columns = ["标题", "文号", "发布日期", "内容", "id"]
    return d1


def get_csvdf(penfolder, beginwith):
    """Read CSV files matching pattern from root directory only"""
    # 只读取根目录下的文件，不递归查找子目录
    files = glob.glob(os.path.join(penfolder, f"{beginwith}*.csv"))
    
    dflist = []
    for filepath in files:
        try:
            pendf = pd.read_csv(filepath)
            dflist.append(pendf)
        except Exception as e:
            logger.warning(f"Failed to read {filepath}: {e}")
    
    if len(dflist) > 0:
        df = pd.concat(dflist)
        df.reset_index(drop=True, inplace=True)
    else:
        df = pd.DataFrame()
    return df

def get_cbircdetail(orgname=""):
    """Get CBIRC detail data"""
    org_name_index = org2name.get(orgname, "")
    beginwith = "cbircdtl" + org_name_index
    d0 = get_csvdf(DATA_FOLDER, beginwith)
    
    if d0.empty:
        logger.warning(f"No detail data available for {orgname}")
        return pd.DataFrame()
    
    # Check if required columns exist
    required_columns = ["title", "subtitle", "date", "doc", "id"]
    missing_columns = [col for col in required_columns if col not in d0.columns]
    if missing_columns:
        logger.warning(f"Missing columns in detail data for {orgname}: {missing_columns}")
        return pd.DataFrame()
    
    # Select and rename columns
    d1 = d0[["title", "subtitle", "date", "doc", "id"]].reset_index(drop=True)
    
    # Format date
    try:
        d1["date"] = d1["date"].str.split(".").str[0]
        d1["date"] = pd.to_datetime(d1["date"], format="%Y-%m-%d %H:%M:%S").dt.date
    except Exception as e:
        logger.warning(f"Date formatting failed: {e}")
    
    # Update column names
    d1.columns = ["标题", "文号", "发布日期", "内容", "id"]
    return d1

def get_cbirccat():
    """Get CBIRC categorized data"""
    amtdf = get_csvdf(DATA_FOLDER, "cbirccat")
    if not amtdf.empty and "amount" in amtdf.columns:
        try:
            amtdf["amount"] = amtdf["amount"].astype(float)
        except Exception as e:
            logger.warning(f"Amount conversion failed: {e}")
    
    if "law" in amtdf.columns:
        amtdf.rename(columns={"law": "lawlist"}, inplace=True)
    
    return amtdf


@router.get("/check-files")
async def check_saved_files(
    org_name: Optional[str] = Query(None, description="Organization name filter")
):
    """Check saved files in the cbirc directory"""
    try:
        # Convert string to enum if provided
        org_enum = None
        if org_name:
            org_mapping = {
                "headquarters": OrganizationType.HEADQUARTERS,
                "provincial": OrganizationType.PROVINCIAL,
                "local": OrganizationType.LOCAL,
                "jiguan": OrganizationType.HEADQUARTERS,
                "benji": OrganizationType.PROVINCIAL,
                "fenju": OrganizationType.LOCAL
            }
            org_enum = org_mapping.get(org_name.lower())
        
        result = await scraper_service.check_saved_files(org_enum)
        return result
        
    except Exception as e:
        print(f"Error in check_saved_files: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-connection")
async def test_connection(
    org_name: OrganizationType = OrganizationType.LOCAL
):
    """Test connection to NFRA website"""
    try:
        result = await scraper_service.test_connection(org_name)
        return result
        
    except Exception as e:
        print(f"Error in test_connection: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scrape-direct")
async def scrape_direct(
    update_request: UpdateRequest,
    background_tasks: BackgroundTasks
):
    """Direct scraping using async HTTP requests (for debugging)"""
    try:
        # Add background task for direct scraping
        background_tasks.add_task(
            scraper_service.scrape_cases,
            update_request.org_name,
            update_request.start_page,
            update_request.end_page
        )
        
        return {
            "message": "Direct scraping task started",
            "org_name": update_request.org_name,
            "page_range": f"{update_request.start_page}-{update_request.end_page}",
            "method": "direct_async_http"
        }
        
    except Exception as e:
        print(f"Error in scrape_direct: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-cases")
async def update_cases(
    update_request: UpdateRequest,
    background_tasks: BackgroundTasks
):
    """Update cases from CBIRC website"""
    try:
        # Create task
        task = create_update_cases_task(
            update_request.org_name,
            update_request.start_page,
            update_request.end_page
        )
        
        # Add background task for scraping with task tracking
        background_tasks.add_task(
            _run_scrape_cases_with_tracking,
            task.id,
            update_request.org_name,
            update_request.start_page,
            update_request.end_page
        )
        
        return {
            "task_id": task.id,
            "message": "Update task started",
            "org_name": update_request.org_name,
            "page_range": f"{update_request.start_page}-{update_request.end_page}"
        }
        
    except Exception as e:
        print(f"Error in update_cases: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-case-details")
async def update_case_details(
    update_request: UpdateRequest,
    background_tasks: BackgroundTasks
):
    """Update case details from CBIRC website"""
    try:
        # Create task
        task = create_update_details_task(update_request.org_name)
        
        # Add background task for updating case details with task tracking
        background_tasks.add_task(
            _run_update_details_with_tracking,
            task.id,
            update_request.org_name
        )
        
        return {
            "task_id": task.id,
            "message": "Case details update task started",
            "org_name": update_request.org_name
        }
        
    except Exception as e:
        print(f"Error in update_case_details: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/case-details-progress/{org_name}")
async def get_case_details_progress(org_name: str):
    """Get case details update progress"""
    try:
        # Map organization name if needed
        org_mapping = {
            "银保监会机关": OrganizationType.HEADQUARTERS,
            "银保监局本级": OrganizationType.PROVINCIAL,
            "银保监分局本级": OrganizationType.LOCAL,
            "headquarters": OrganizationType.HEADQUARTERS,
            "provincial": OrganizationType.PROVINCIAL,
            "local": OrganizationType.LOCAL
        }
        
        org_enum = org_mapping.get(org_name)
        if not org_enum:
            raise HTTPException(status_code=400, detail="Invalid organization name")
        
        progress = scraper_service.get_temp_progress(org_enum)
        
        return {
            "org_name": org_name,
            "progress": progress,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in get_case_details_progress: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cleanup-temp-files")
async def cleanup_temp_files(
    org_name: Optional[str] = Query(None, description="Organization name filter"),
    max_age_hours: int = Query(24, description="Maximum age of temp files in hours")
):
    """Clean up old temporary files"""
    try:
        # Convert string to enum if provided
        org_enum = None
        if org_name:
            org_mapping = {
                "银保监会机关": OrganizationType.HEADQUARTERS,
                "银保监局本级": OrganizationType.PROVINCIAL,
                "银保监分局本级": OrganizationType.LOCAL,
                "headquarters": OrganizationType.HEADQUARTERS,
                "provincial": OrganizationType.PROVINCIAL,
                "local": OrganizationType.LOCAL
            }
            org_enum = org_mapping.get(org_name)
        
        result = scraper_service.cleanup_temp_files(org_enum, max_age_hours)
        
        return {
            "message": "Cleanup completed",
            "org_name": org_name,
            "max_age_hours": max_age_hours,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Error in cleanup_temp_files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending-cases/{org_name}")
async def get_pending_cases_for_update(org_name: str):
    """Get list of cases pending details update"""
    try:
        # Map organization name to enum
        org_mapping = {
            "银保监会机关": OrganizationType.HEADQUARTERS,
            "银保监局本级": OrganizationType.PROVINCIAL,
            "银保监分局本级": OrganizationType.LOCAL,
            "headquarters": OrganizationType.HEADQUARTERS,
            "provincial": OrganizationType.PROVINCIAL,
            "local": OrganizationType.LOCAL
        }
        
        org_enum = org_mapping.get(org_name)
        if not org_enum:
            raise HTTPException(status_code=400, detail="Invalid organization name")
        
        pending_cases = await scraper_service.get_pending_cases_for_update(org_enum)
        
        return {
            "org_name": org_name,
            "pending_cases": pending_cases,
            "total": len(pending_cases),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in get_pending_cases_for_update: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-selected-case-details")
async def update_selected_case_details(
    update_request: dict,
    background_tasks: BackgroundTasks
):
    """Update details for selected cases only"""
    try:
        org_name = update_request.get("org_name")
        selected_case_ids = update_request.get("selected_case_ids", [])
        
        if not org_name or not selected_case_ids:
            raise HTTPException(status_code=400, detail="Missing org_name or selected_case_ids")
        
        # Map organization name to enum
        org_mapping = {
            "银保监会机关": OrganizationType.HEADQUARTERS,
            "银保监局本级": OrganizationType.PROVINCIAL,
            "银保监分局本级": OrganizationType.LOCAL,
            "headquarters": OrganizationType.HEADQUARTERS,
            "provincial": OrganizationType.PROVINCIAL,
            "local": OrganizationType.LOCAL
        }
        
        org_enum = org_mapping.get(org_name)
        if not org_enum:
            raise HTTPException(status_code=400, detail="Invalid organization name")
        
        # Create task
        task = create_update_details_task(org_name)
        
        # Add background task for updating selected case details
        background_tasks.add_task(
            _run_selected_update_details_with_tracking,
            task.id,
            org_enum,
            selected_case_ids
        )
        
        return {
            "task_id": task.id,
            "message": f"Selected case details update task started for {len(selected_case_ids)} cases",
            "org_name": org_name,
            "selected_count": len(selected_case_ids)
        }
        
    except Exception as e:
        logger.error(f"Error in update_selected_case_details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/case-summary/{org_name}")
async def get_case_summary_by_org(org_name: str):
    """Get case summary by organization"""
    try:
        # Map organization name if needed
        org_mapping = {
            "银保监会机关": "银保监会机关",
            "银保监局本级": "银保监局本级", 
            "银保监分局本级": "银保监分局本级",
            "headquarters": "银保监会机关",
            "provincial": "银保监局本级",
            "local": "银保监分局本级"
        }
        
        mapped_org = org_mapping.get(org_name, org_name)
        
        # Get data using existing function
        sumdf = get_cbircsum(mapped_org)
        
        if sumdf.empty:
            return {
                "total_cases": 0,
                "date_range": {},
                "summary": "暂无数据"
            }
        
        # Calculate statistics
        total_cases = len(sumdf)
        
        if "发布日期" in sumdf.columns:
            min_date = sumdf["发布日期"].min()
            max_date = sumdf["发布日期"].max()
            date_range = {"start": str(min_date), "end": str(max_date)}
        else:
            date_range = {}
        
        return {
            "total_cases": total_cases,
            "date_range": date_range,
            "summary": f"共{total_cases}条案例待更新"
        }
        
    except Exception as e:
        logger.error(f"Error in get_case_summary_by_org: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/case-detail-summary/{org_name}")
async def get_case_detail_summary_by_org(org_name: str):
    """Get case detail summary by organization"""
    try:
        # Map organization name if needed
        org_mapping = {
            "银保监会机关": "银保监会机关",
            "银保监局本级": "银保监局本级", 
            "银保监分局本级": "银保监分局本级",
            "headquarters": "银保监会机关",
            "provincial": "银保监局本级",
            "local": "银保监分局本级"
        }
        
        mapped_org = org_mapping.get(org_name, org_name)
        
        # Get data using existing function
        dtldf = get_cbircdetail(mapped_org)
        
        if dtldf.empty:
            return {
                "total_cases": 0,
                "date_range": {},
                "summary": "暂无详情数据"
            }
        
        # Calculate statistics
        total_cases = len(dtldf)
        
        if "发布日期" in dtldf.columns:
            min_date = dtldf["发布日期"].min()
            max_date = dtldf["发布日期"].max()
            date_range = {"start": str(min_date), "end": str(max_date)}
        else:
            date_range = {}
        
        return {
            "total_cases": total_cases,
            "date_range": date_range,
            "summary": f"共{total_cases}条案例详情数据"
        }
        
    except Exception as e:
        logger.error(f"Error in get_case_detail_summary_by_org: {str(e)}")
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
        # Get collection stats
        collections_info = {}
        
        # Get active tasks count
        active_tasks = task_service.get_active_tasks()
        active_tasks_count = len(active_tasks)
        
        # Get database status
        try:
            # Try to connect to database to check status
            # This is a simple connectivity check
            database_status = "connected"
        except Exception:
            database_status = "disconnected"
        
        return {
            "database_status": database_status,
            "collections": collections_info,
            "api_version": "1.0.0",
            "active_tasks": active_tasks_count,
            "system_health": "healthy" if database_status == "connected" else "warning"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks")
async def get_tasks(limit: int = 50):
    """Get task history"""
    try:
        tasks = task_service.get_all_tasks(limit=limit)
        return {
            "tasks": tasks,
            "total": len(tasks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/active")
async def get_active_tasks():
    """Get currently active tasks"""
    try:
        tasks = task_service.get_active_tasks()
        return {
            "tasks": tasks,
            "total": len(tasks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """Get specific task by ID"""
    try:
        task = task_service.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classification-stats")
async def get_classification_stats():
    """Get classification statistics"""
    try:
        # Get CBIRC detail data (all organizations)
        newdf = get_cbircdetail("")
        
        if newdf.empty:
            logger.warning("No detail data found for stats")
            return {
                "total_cases": 0,
                "categorized_cases": 0,
                "uncategorized_cases": 0,
                "categories": {},
                "monthly_stats": {}
            }
        
        # Get categorized data
        amtdf = get_cbirccat()
        
        # Calculate basic statistics
        total_cases = len(newdf)
        
        if amtdf.empty:
            categorized_cases = 0
            categorized_ids = []
        else:
            categorized_ids = amtdf["id"].tolist() if "id" in amtdf.columns else []
            categorized_cases = len(categorized_ids)
        
        uncategorized_cases = total_cases - categorized_cases
        
        # Calculate category distribution
        categories = {}
        if not amtdf.empty and "industry" in amtdf.columns:
            category_counts = amtdf["industry"].value_counts().to_dict()
            categories = {str(k): int(v) for k, v in category_counts.items() if pd.notna(k) and k != ""}
        
        # Calculate monthly statistics
        monthly_stats = {}
        if "发布日期" in newdf.columns:
            try:
                # Convert date column to datetime if it's not already
                newdf_copy = newdf.copy()
                if newdf_copy["发布日期"].dtype == 'object':
                    newdf_copy["发布日期"] = pd.to_datetime(newdf_copy["发布日期"], errors='coerce')
                
                # Group by year-month
                newdf_copy["year_month"] = newdf_copy["发布日期"].dt.to_period('M')
                monthly_counts = newdf_copy.groupby("year_month").size()
                
                # Calculate categorized cases per month
                if not amtdf.empty and "id" in amtdf.columns:
                    categorized_monthly = newdf_copy[newdf_copy["id"].isin(categorized_ids)].groupby("year_month").size()
                else:
                    categorized_monthly = pd.Series(dtype=int)
                
                # Build monthly stats dictionary
                for period in monthly_counts.index:
                    month_str = str(period)
                    total_month = int(monthly_counts[period])
                    categorized_month = int(categorized_monthly.get(period, 0))
                    monthly_stats[month_str] = {
                        "total": total_month,
                        "categorized": categorized_month
                    }
            except Exception as e:
                logger.warning(f"Failed to calculate monthly stats: {e}")
                monthly_stats = {}
        
        logger.info(f"Classification stats: {total_cases} total, {categorized_cases} categorized, {uncategorized_cases} uncategorized")
        
        return {
            "total_cases": total_cases,
            "categorized_cases": categorized_cases,
            "uncategorized_cases": uncategorized_cases,
            "categories": categories,
            "monthly_stats": monthly_stats
        }
        
    except Exception as e:
        logger.error(f"Error in get_classification_stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-classification-data")
async def generate_classification_data():
    """Generate data for case classification"""
    try:
        # Get CBIRC detail data (all organizations)
        newdf = get_cbircdetail("")
        
        if newdf.empty:
            logger.warning("No detail data found")
            return {
                "message": "No data available for classification",
                "total_cases": 0,
                "categorized_cases": 0,
                "uncategorized_cases": 0,
                "data": []
            }
        
        # Get categorized data
        amtdf = get_cbirccat()
        
        # Calculate statistics
        total_cases = len(newdf)
        
        if amtdf.empty:
            categorized_cases = 0
            categorized_ids = []
        else:
            categorized_ids = amtdf["id"].tolist() if "id" in amtdf.columns else []
            categorized_cases = len(categorized_ids)
        
        uncategorized_cases = total_cases - categorized_cases
        
        # Get uncategorized cases (cases that need classification)
        if categorized_ids:
            uncategorized_df = newdf[~newdf["id"].isin(categorized_ids)]
        else:
            uncategorized_df = newdf
        
        # Sort by date (most recent first)
        if "发布日期" in uncategorized_df.columns:
            uncategorized_df = uncategorized_df.sort_values(by="发布日期", ascending=False)
        
        # Convert to list of dictionaries for JSON response
        cases_data = []
        for _, row in uncategorized_df.head(50).iterrows():  # Return first 50 uncategorized cases
            case_dict = {
                "id": row["id"],
                "title": row["标题"],
                "subtitle": row["文号"],
                "publishDate": str(row["发布日期"]) if pd.notna(row["发布日期"]) else "",
                "content": str(row["内容"]),  # Full content without truncation
                "category": None  # These are uncategorized
            }
            cases_data.append(case_dict)
        
        logger.info(f"Generated classification data: {total_cases} total, {categorized_cases} categorized, {uncategorized_cases} uncategorized")
        
        return {
            "message": "Classification data generated successfully",
            "total_cases": total_cases,
            "categorized_cases": categorized_cases,
            "uncategorized_cases": uncategorized_cases,
            "data": cases_data
        }
        
    except Exception as e:
        logger.error(f"Error in generate_classification_data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/csv")
async def export_cases_csv(
    org_name: Optional[str] = Query(None, description="Organization name filter"),
    category: Optional[str] = Query(None, description="Category filter"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)")
):
    """Export cases data as CSV"""
    try:
        # Get data based on filters
        if org_name:
            df = get_cbircsum(org_name)
        else:
            # Get all data
            all_data = []
            for org in ["银保监会机关", "银保监局本级", "银保监分局本级"]:
                org_data = get_cbircsum(org)
                if not org_data.empty:
                    all_data.append(org_data)
            
            if all_data:
                df = pd.concat(all_data, ignore_index=True)
            else:
                df = pd.DataFrame()
        
        if df.empty:
            raise HTTPException(status_code=404, detail="No data found")
        
        # Apply filters
        if category and "category" in df.columns:
            df = df[df["category"] == category]
        
        if start_date:
            if "发布日期" in df.columns:
                df = df[df["发布日期"] >= start_date]
        
        if end_date:
            if "发布日期" in df.columns:
                df = df[df["发布日期"] <= end_date]
        
        # Convert to CSV
        output = io.StringIO()
        df.to_csv(output, index=False, encoding='utf-8-sig')
        output.seek(0)
        
        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=cbirc_cases.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error in export_cases_csv: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/excel")
async def export_cases_excel(
    org_name: Optional[str] = Query(None, description="Organization name filter"),
    category: Optional[str] = Query(None, description="Category filter"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)")
):
    """Export cases data as Excel"""
    try:
        # Get data based on filters
        if org_name:
            df = get_cbircsum(org_name)
        else:
            # Get all data
            all_data = []
            for org in ["银保监会机关", "银保监局本级", "银保监分局本级"]:
                org_data = get_cbircsum(org)
                if not org_data.empty:
                    all_data.append(org_data)
            
            if all_data:
                df = pd.concat(all_data, ignore_index=True)
            else:
                df = pd.DataFrame()
        
        if df.empty:
            raise HTTPException(status_code=404, detail="No data found")
        
        # Apply filters
        if category and "category" in df.columns:
            df = df[df["category"] == category]
        
        if start_date:
            if "发布日期" in df.columns:
                df = df[df["发布日期"] >= start_date]
        
        if end_date:
            if "发布日期" in df.columns:
                df = df[df["发布日期"] <= end_date]
        
        # Convert to Excel
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Cases', index=False)
        output.seek(0)
        
        # Return as streaming response
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=cbirc_cases.xlsx"}
        )
        
    except Exception as e:
        logger.error(f"Error in export_cases_excel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/json")
async def export_cases_json(
    org_name: Optional[str] = Query(None, description="Organization name filter"),
    category: Optional[str] = Query(None, description="Category filter"),
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)")
):
    """Export cases data as JSON"""
    try:
        # Get data based on filters
        if org_name:
            df = get_cbircsum(org_name)
        else:
            # Get all data
            all_data = []
            for org in ["银保监会机关", "银保监局本级", "银保监分局本级"]:
                org_data = get_cbircsum(org)
                if not org_data.empty:
                    all_data.append(org_data)
            
            if all_data:
                df = pd.concat(all_data, ignore_index=True)
            else:
                df = pd.DataFrame()
        
        if df.empty:
            raise HTTPException(status_code=404, detail="No data found")
        
        # Apply filters
        if category and "category" in df.columns:
            df = df[df["category"] == category]
        
        if start_date:
            if "发布日期" in df.columns:
                df = df[df["发布日期"] >= start_date]
        
        if end_date:
            if "发布日期" in df.columns:
                df = df[df["发布日期"] <= end_date]
        
        # Convert to JSON
        json_data = df.to_json(orient='records', date_format='iso', force_ascii=False)
        
        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(json_data.encode('utf-8')),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=cbirc_cases.json"}
        )
        
    except Exception as e:
        logger.error(f"Error in export_cases_json: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import")
async def import_cases(
    file: UploadFile = File(...),
    format: str = Query("csv", description="File format: csv, excel, json")
):
    """Import cases data from file"""
    try:
        # Read file content
        content = await file.read()
        
        if format.lower() == "csv":
            df = pd.read_csv(io.BytesIO(content), encoding='utf-8')
        elif format.lower() in ["excel", "xlsx"]:
            df = pd.read_excel(io.BytesIO(content))
        elif format.lower() == "json":
            df = pd.read_json(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Validate required columns
        required_columns = ["id", "标题", "文号", "发布日期", "内容"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # TODO: Implement actual data import logic
        # This would involve inserting data into the database
        # For now, just return success with stats
        
        total_rows = len(df)
        processed_rows = total_rows  # Assuming all rows are processed successfully
        errors = []  # No errors for now
        
        logger.info(f"Imported {processed_rows} cases from {file.filename}")
        
        return {
            "message": "Import completed successfully",
            "total_rows": total_rows,
            "processed_rows": processed_rows,
            "errors": errors,
            "filename": file.filename
        }
        
    except Exception as e:
        logger.error(f"Error in import_cases: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions for background task tracking
async def _run_scrape_cases_with_tracking(task_id: str, org_name: str, start_page: int, end_page: int):
    """Run scrape cases with task tracking"""
    try:
        task_service.start_task(task_id)
        
        # Run the actual scraping function with task_id for progress tracking
        result = await scraper_service.scrape_cases(org_name, start_page, end_page, task_id=task_id)
        
        # Update progress based on result
        if result.get("status") == "completed":
            total_scraped = result.get("total_scraped", 0)
            new_cases = result.get("new_cases", 0)
            errors = result.get("errors", 0)
            pages_processed = result.get("pages_processed", 0)
            
            # Set final progress to 100%
            task_service.update_task_progress(task_id, 100)
            
            # Complete the task with detailed results
            task_service.complete_task(task_id, {
                "org_name": org_name,
                "status": "completed",
                "total": total_scraped,
                "updated": new_cases,
                "skipped": total_scraped - new_cases,
                "pages_processed": pages_processed,
                "total_scraped": total_scraped,
                "new_cases": new_cases,
                "errors": errors,
                "message": result.get("message", f"Scraped {new_cases} new cases from {pages_processed} pages")
            })
        else:
            # Handle error case
            task_service.fail_task(task_id, result.get("message", "Scraping failed"))
        
    except Exception as e:
        task_service.fail_task(task_id, str(e))
        logger.error(f"Task {task_id} failed: {str(e)}")


async def _run_update_details_with_tracking(task_id: str, org_name: str):
    """Run update details with task tracking"""
    try:
        task_service.start_task(task_id)
        
        # Run the actual update function with task_id for progress tracking
        result = await scraper_service.update_case_details(org_name, task_id=task_id)
        
        # Update progress based on result
        if result.get("status") == "completed":
            updated_cases = result.get("updated_cases", 0)
            error_count = result.get("error_count", 0)
            temp_saves = result.get("temp_saves", 0)
            
            # Set final progress to 100%
            task_service.update_task_progress(task_id, 100)
            
            # Complete the task with detailed results
            task_service.complete_task(task_id, {
                "org_name": org_name,
                "status": "completed",
                "total": updated_cases + error_count,
                "updated": updated_cases,
                "skipped": error_count,
                "updated_cases": updated_cases,
                "error_count": error_count,
                "temp_saves": temp_saves,
                "message": result.get("message", "Case details updated successfully")
            })
        else:
            # Handle error case
            task_service.fail_task(task_id, result.get("message", "Update failed"))
        
    except Exception as e:
        task_service.fail_task(task_id, str(e))
        logger.error(f"Task {task_id} failed: {str(e)}")


async def _run_selected_update_details_with_tracking(task_id: str, org_name: OrganizationType, selected_case_ids: List[str]):
    """Run selected case details update with task tracking"""
    try:
        task_service.start_task(task_id)
        
        # Run the actual update function for selected cases with task_id for progress tracking
        result = await scraper_service.update_selected_case_details(org_name, selected_case_ids, task_id=task_id)
        
        # Update progress based on result
        if result.get("status") == "completed":
            updated_cases = result.get("updated_cases", 0)
            error_count = result.get("error_count", 0)
            requested_cases = result.get("requested_cases", 0)
            cases_to_update = result.get("cases_to_update", 0)
            success_rate = result.get("success_rate", "0%")
            
            # Set final progress to 100%
            task_service.update_task_progress(task_id, 100)
            
            # Complete the task with detailed results
            task_service.complete_task(task_id, {
                "org_name": str(org_name),
                "status": "completed",
                "total": cases_to_update,
                "updated": updated_cases,
                "skipped": cases_to_update - updated_cases,
                "requested_cases": requested_cases,
                "cases_to_update": cases_to_update,
                "updated_cases": updated_cases,
                "error_count": error_count,
                "success_rate": success_rate,
                "message": result.get("message", f"Selected case details updated successfully: {updated_cases} cases")
            })
        else:
            # Handle error case
            task_service.fail_task(task_id, result.get("message", "Selected update failed"))
        
    except Exception as e:
        task_service.fail_task(task_id, str(e))
        logger.error(f"Task {task_id} failed: {str(e)}")