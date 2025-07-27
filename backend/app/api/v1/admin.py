import os
import glob
import pandas as pd
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.case import UpdateRequest, OrganizationType
from app.services.scraper_service import scraper_service
from app.core.database import db_manager
from app.core.config import settings
from pymongo import MongoClient
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Data folder path
DATA_FOLDER = "/Users/vyang/Desktop/spaces/dbcbirc/cbirc"

# Organization name mapping
org2name = {
    "银保监会机关": "jiguan",
    "银保监局本级": "benji",
    "银保监分局本级": "fenju",
    "": "",
}

def get_csvdf(penfolder, beginwith):
    """Read CSV files matching pattern"""
    files = glob.glob(os.path.join(penfolder, "**", f"{beginwith}*.csv"), recursive=True)
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
        print(f"Error in generate_classification_data: {str(e)}")
        import traceback
        traceback.print_exc()
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
        
        # This would typically get actual collection stats
        # For now, return basic info
        return {
            "database_status": "connected",
            "collections": collections_info,
            "api_version": "1.0.0"
        }
        
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
                "content": row["内容"][:500] + "..." if len(str(row["内容"])) > 500 else str(row["内容"]),  # Truncate long content
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